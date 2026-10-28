import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Etat } from '../types'

const etat = atom({ plugin: 'barre-etat', key: 'etat' } as const, null)
// heure courante, remise à jour chaque minute : le compte à rebours se redessine
const now = atom({ plugin: 'barre-etat', key: 'now' } as const, 0)

// couleur d'un pourcentage : vert, puis orange à 50 %, rouge à 80 %
const tone = (p: number) => (p >= 80 ? 'error' : p >= 50 ? 'warning' : 'success')

// barre de progression : 10 segments en dégradé du vert au rouge selon leur place
const SEGMENTS = ['#22C55E', '#4ADE80', '#A3E635', '#D9F99D', '#FACC15', '#FBBF24', '#F59E0B', '#F97316', '#EF4444', '#DC2626']

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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await refresh($)
    $.clock.every(60000, () => tick($))
    return r
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
    const { Box, Text } = $.ui.resolve(e)
    const sep = <Text dimColor> │ </Text>
    const pct = (label: string, p: number | undefined) => {
      if (p === undefined) {
        return null
      }
      const filled = Math.min(SEGMENTS.length, Math.max(p > 0 ? 1 : 0, Math.round(p / 10)))
      return (
        <Text>
          <Text dimColor>{label} </Text>
          {SEGMENTS.map((c, i) =>
            i < filled ? <Text key={`f${i}`} color={c}>▰</Text> : <Text key={`e${i}`} dimColor>▱</Text>
          )}
          <Text color={tone(p)} bold> {Math.round(p)}%</Text>
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
