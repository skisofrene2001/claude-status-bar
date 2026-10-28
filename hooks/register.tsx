import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Etat } from '../types'
import { PALETTES, PALETTE_DEFAUT, STYLES, STYLE_DEFAUT, apercu, barre, choisir, seuil } from './barres'

const etat = atom({ plugin: 'barre-etat', key: 'etat' } as const, null)
// heure courante, remise à jour chaque minute : le compte à rebours se redessine
const now = atom({ plugin: 'barre-etat', key: 'now' } as const, 0)
// choix de l'utilisateur, gardé d'une session à l'autre ($.store)
const style = atom({ plugin: 'barre-etat', key: 'style' } as const, STYLE_DEFAUT)
const couleur = atom({ plugin: 'barre-etat', key: 'couleur' } as const, PALETTE_DEFAUT)

const folderOf = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd

const two = (n: number) => String(n).padStart(2, '0')

// 14:20
function clockOf(ms: number) {
  const d = new Date(ms)
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}

// 2 h 05, ou 12 min
function durationOf(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60000))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${two(minutes % 60)}` : `${minutes} min`
}

async function tick($: EngineInterface) {
  const t = await $.clock.now()
  await update($, now, () => t)
}

async function refresh($: EngineInterface, usage?: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>) {
  const u = usage ?? (await $.session.usage())
  const five = u.rateLimits.find(r => r.kind === 'five_hour')
  const value: Etat = {
    model: await $.session.model(),
    folder: folderOf(await $.session.cwd()),
    ctx: u.context.percent,
    fiveHour: five?.percentUsed,
    fiveHourReset: five?.resetsAt === undefined ? undefined : Date.parse(five.resetsAt),
    sevenDay: u.rateLimits.find(r => r.kind === 'seven_day')?.percentUsed,
    usd: u.cost?.usd,
  }
  await update($, etat, () => value)
  await tick($)
}

// relit les choix enregistrés (store) dans l'état que lit le dessin
async function loadChoices($: EngineInterface) {
  const s = await $.store.get('style')
  const c = await $.store.get('couleur')
  await update($, style, () => (typeof s === 'string' && STYLES.some(x => x.id === s) ? s : STYLE_DEFAUT))
  await update($, couleur, () => (typeof c === 'string' && PALETTES.some(x => x.id === c) ? c : PALETTE_DEFAUT))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({
      name: 'barre-style',
      description: 'Bandeau d\'état : choisir le style des barres de progression',
      argumentHint: '[numéro ou nom]',
      immediate: true,
    })
    await $.command.register({
      name: 'barre-couleur',
      description: 'Bandeau d\'état : choisir les couleurs des barres de progression',
      argumentHint: '[numéro ou nom]',
      immediate: true,
    })
    await loadChoices($)
    await refresh($)
    $.clock.every(60000, () => tick($))
    return r
  })

  on('command.run', { command: 'barre-style' }, async ($, e) => {
    const actuel = await read($, style)
    if (e.args.trim() === '') {
      const lignes = STYLES.map((s, i) => `${i + 1}. ${apercu(s.id)}  ${s.nom}${s.id === actuel ? '  ← actuel' : ''}`)
      return { text: `Styles de barre :\n${lignes.join('\n')}\n\nChoisir : /barre-style <numéro>` }
    }
    const choix = choisir(STYLES, e.args)
    if (choix === undefined) {
      return { text: `Style inconnu : « ${e.args.trim()} ». Tapez /barre-style pour la liste.` }
    }
    await $.store.set('style', choix.id)
    await update($, style, () => choix.id)
    return { text: `Style des barres : ${choix.nom} (${apercu(choix.id)})` }
  })

  on('command.run', { command: 'barre-couleur' }, async ($, e) => {
    const actuel = await read($, couleur)
    if (e.args.trim() === '') {
      const lignes = PALETTES.map((c, i) => `${i + 1}. ${c.nom}${c.id === actuel ? '  ← actuelle' : ''}`)
      return { text: `Couleurs des barres :\n${lignes.join('\n')}\n\nChoisir : /barre-couleur <numéro>` }
    }
    const choix = choisir(PALETTES, e.args)
    if (choix === undefined) {
      return { text: `Couleurs inconnues : « ${e.args.trim()} ». Tapez /barre-couleur pour la liste.` }
    }
    await $.store.set('couleur', choix.id)
    await update($, couleur, () => choix.id)
    return { text: `Couleurs des barres : ${choix.nom}` }
  })

  // le moteur mesure après chaque réponse : contexte, limites, coût
  on('session.measure', async ($, e, next) => {
    await refresh($, e)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, etat)
    if (e.props.hasSurvey || s === null) {
      return next(e)
    }
    const t = await read($, now)
    const styleId = await read($, style)
    const paletteId = await read($, couleur)
    const { Box, Text } = $.ui.resolve(e)
    const sep = <Text dimColor> │ </Text>
    const pct = (label: string, p: number | undefined) => {
      if (p === undefined) {
        return null
      }
      return (
        <Text>
          <Text dimColor>{label} </Text>
          {barre(styleId, paletteId, p).map((c, i) =>
            c.dim ? <Text key={`c${i}`} dimColor>{c.ch}</Text> : <Text key={`c${i}`} color={c.color}>{c.ch}</Text>,
          )}
          <Text color={seuil(p)} bold> {Math.round(p)}%</Text>
        </Text>
      )
    }
    // fin de la fenêtre de 5 h : heure de remise à zéro du quota et temps restant
    const hasReset = s.fiveHour !== undefined && s.fiveHourReset !== undefined && !Number.isNaN(s.fiveHourReset) && t > 0

    return (
      <Box flexDirection="row" flexWrap="wrap">
        <Text color="claude" bold>{s.model}</Text>
        {s.ctx !== undefined && sep}
        {pct('ctx', s.ctx)}
        {s.fiveHour !== undefined && sep}
        {pct('5h', s.fiveHour)}
        {hasReset && (
          <Text dimColor>
            {' '}→ {clockOf(s.fiveHourReset ?? 0)} (dans {durationOf((s.fiveHourReset ?? 0) - t)})
          </Text>
        )}
        {s.sevenDay !== undefined && sep}
        {pct('7j', s.sevenDay)}
        {s.usd !== undefined && sep}
        {s.usd !== undefined && <Text>${s.usd.toFixed(2)}</Text>}
        {sep}
        <Text color="suggestion">{s.folder}</Text>
      </Box>
    )
  })
}
