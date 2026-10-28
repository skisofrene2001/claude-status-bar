import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Etat, Lang } from '../types'
import { PALETTES, PALETTE_DEFAUT, STYLES, STYLE_DEFAUT, apercu, choisir } from './barres'
import { ajuster } from './ligne'
import type { Hauteur } from './ligne'

const etat = atom({ plugin: 'status-bar', key: 'etat' } as const, null)
// heure courante, remise à jour chaque minute : le compte à rebours se redessine
const now = atom({ plugin: 'status-bar', key: 'now' } as const, 0)
// choix de l'utilisateur, gardés d'une session à l'autre ($.store)
const style = atom({ plugin: 'status-bar', key: 'style' } as const, STYLE_DEFAUT)
const couleur = atom({ plugin: 'status-bar', key: 'couleur' } as const, PALETTE_DEFAUT)
const lang = atom({ plugin: 'status-bar', key: 'lang' } as const, 'en')
const HAUTEUR_DEFAUT: Hauteur = 3
const hauteur = atom({ plugin: 'status-bar', key: 'hauteur' } as const, HAUTEUR_DEFAUT)

// commandes : anglais (/bar-style, /bar-color) et alias français (/barre-style, /barre-couleur)
const STYLE_CMDS: Record<string, Lang> = { 'bar-style': 'en', 'barre-style': 'fr' }
const COLOR_CMDS: Record<string, Lang> = { 'bar-color': 'en', 'barre-couleur': 'fr' }
const HEIGHT_CMDS: Record<string, Lang> = { 'bar-height': 'en', 'barre-hauteur': 'fr' }

// taille du texte des cases dans l'app, par hauteur choisie
const TAILLES = { 1: 'body', 2: 'heading', 3: 'title' } as const
const HAUTEURS: { h: Hauteur; fr: string; en: string }[] = [
  { h: 1, fr: 'normale', en: 'normal' },
  { h: 2, fr: 'grande', en: 'large' },
  { h: 3, fr: 'très grande', en: 'extra large' },
]

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

// langue de l'ordinateur, tant que l'utilisateur n'a lancé aucune commande
function systemLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  } catch {
    return 'en'
  }
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
  const l = await $.store.get('lang')
  const h = await $.store.get('hauteur')
  await update($, style, () => (typeof s === 'string' && STYLES.some(x => x.id === s) ? s : STYLE_DEFAUT))
  await update($, couleur, () => (typeof c === 'string' && PALETTES.some(x => x.id === c) ? c : PALETTE_DEFAUT))
  await update($, lang, () => (l === 'fr' || l === 'en' ? l : systemLang()))
  await update($, hauteur, () => (h === 1 || h === 2 || h === 3 ? h : HAUTEUR_DEFAUT))
}

// la langue de la commande devient celle du bandeau
async function setLang($: EngineInterface, l: Lang) {
  await $.store.set('lang', l)
  await update($, lang, () => l)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    const commands = [
      { name: 'bar-style', description: 'Status bar: choose the progress bar style' },
      { name: 'bar-color', description: 'Status bar: choose the progress bar colors' },
      { name: 'barre-style', description: 'Bandeau d\'état : choisir le style des barres de progression' },
      { name: 'barre-couleur', description: 'Bandeau d\'état : choisir les couleurs des barres de progression' },
      { name: 'bar-height', description: 'Status bar: choose the progress bar height (1, 2 or 3)' },
      { name: 'barre-hauteur', description: 'Bandeau d\'état : choisir la hauteur des barres (1, 2 ou 3)' },
    ]
    for (const c of commands) {
      await $.command.register({ ...c, argumentHint: '[number | name]', immediate: true })
    }
    await loadChoices($)
    await refresh($)
    $.clock.every(60000, () => tick($))
    return r
  })

  on('command.run', async ($, e, next) => {
    const styleLang = STYLE_CMDS[e.command]
    const colorLang = COLOR_CMDS[e.command]
    if (styleLang !== undefined) {
      const fr = styleLang === 'fr'
      await setLang($, styleLang)
      const actuel = await read($, style)
      if (e.args.trim() === '') {
        const lignes = STYLES.map(
          (s, i) => `${i + 1}. ${apercu(s.id)}  ${fr ? s.nom : s.en}${s.id === actuel ? (fr ? '  ← actuel' : '  ← current') : ''}`,
        )
        return fr
          ? { text: `Styles de barre :\n${lignes.join('\n')}\n\nChoisir : /barre-style <numéro>` }
          : { text: `Bar styles:\n${lignes.join('\n')}\n\nChoose: /bar-style <number>` }
      }
      const choix = choisir(STYLES, e.args)
      if (choix === undefined) {
        return fr
          ? { text: `Style inconnu : « ${e.args.trim()} ». Tapez /barre-style pour la liste.` }
          : { text: `Unknown style: "${e.args.trim()}". Type /bar-style for the list.` }
      }
      await $.store.set('style', choix.id)
      await update($, style, () => choix.id)
      return { text: `${fr ? 'Style des barres' : 'Bar style'} : ${fr ? choix.nom : choix.en} (${apercu(choix.id)})` }
    }
    if (colorLang !== undefined) {
      const fr = colorLang === 'fr'
      await setLang($, colorLang)
      const actuel = await read($, couleur)
      if (e.args.trim() === '') {
        const lignes = PALETTES.map(
          (c, i) => `${i + 1}. ${fr ? c.nom : c.en}${c.id === actuel ? (fr ? '  ← actuelle' : '  ← current') : ''}`,
        )
        return fr
          ? { text: `Couleurs des barres :\n${lignes.join('\n')}\n\nChoisir : /barre-couleur <numéro>` }
          : { text: `Bar colors:\n${lignes.join('\n')}\n\nChoose: /bar-color <number>` }
      }
      const choix = choisir(PALETTES, e.args)
      if (choix === undefined) {
        return fr
          ? { text: `Couleurs inconnues : « ${e.args.trim()} ». Tapez /barre-couleur pour la liste.` }
          : { text: `Unknown colors: "${e.args.trim()}". Type /bar-color for the list.` }
      }
      await $.store.set('couleur', choix.id)
      await update($, couleur, () => choix.id)
      return { text: `${fr ? 'Couleurs des barres' : 'Bar colors'} : ${fr ? choix.nom : choix.en}` }
    }
    const heightLang = HEIGHT_CMDS[e.command]
    if (heightLang !== undefined) {
      const fr = heightLang === 'fr'
      await setLang($, heightLang)
      const actuel = await read($, hauteur)
      const n = Number(e.args.trim())
      if (e.args.trim() === '') {
        const lignes = HAUTEURS.map(x => `${x.h}. ${fr ? x.fr : x.en}${x.h === actuel ? (fr ? '  ← actuelle' : '  ← current') : ''}`)
        return fr
          ? { text: `Hauteur des barres :\n${lignes.join('\n')}\n\nChoisir : /barre-hauteur <1, 2 ou 3>` }
          : { text: `Bar height:\n${lignes.join('\n')}\n\nChoose: /bar-height <1, 2 or 3>` }
      }
      if (n !== 1 && n !== 2 && n !== 3) {
        return fr
          ? { text: `Hauteur inconnue : « ${e.args.trim()} ». Choisissez 1, 2 ou 3.` }
          : { text: `Unknown height: "${e.args.trim()}". Choose 1, 2 or 3.` }
      }
      await $.store.set('hauteur', n)
      await update($, hauteur, () => n)
      const x = HAUTEURS[n - 1]!
      return { text: `${fr ? 'Hauteur des barres' : 'Bar height'} : ${n} (${fr ? x.fr : x.en})` }
    }
    return next(e)
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
    const fr = (await read($, lang)) === 'fr'
    const h = await read($, hauteur)
    const app = e.surface !== 'terminal'
    const { Box, Text } = $.ui.resolve(e)
    // fin de la fenêtre de 5 h : heure de remise à zéro du quota et temps restant
    const hasReset = s.fiveHour !== undefined && s.fiveHourReset !== undefined && !Number.isNaN(s.fiveHourReset) && t > 0
    const morceaux = ajuster(
      {
        ...s,
        reset: hasReset
          ? { heure: clockOf(s.fiveHourReset ?? 0), reste: durationOf((s.fiveHourReset ?? 0) - t) }
          : undefined,
        style: styleId,
        palette: paletteId,
        fr,
        hauteur: h,
      },
      e.props.bodyColumns,
      app,
    )
    // cases des barres agrandies dans l'app ; le reste du texte garde sa taille
    const taille = app ? TAILLES[h] : undefined

    // une seule ligne, jamais de retour à la ligne : ajuster() a déjà fait tenir le contenu
    return (
      <Box flexDirection="row" flexWrap="nowrap" alignItems="center">
        <Text wrap="truncate-end">
          {morceaux.map((m, i) =>
            m.dim ? (
              <Text key={`m${i}`} dimColor size={m.barre ? taille : undefined}>{m.text}</Text>
            ) : (
              <Text key={`m${i}`} color={m.color} bold={m.bold} size={m.barre ? taille : undefined}>{m.text}</Text>
            ),
          )}
        </Text>
      </Box>
    )
  })
}
