// Generates the README preview images (docs/*.svg) from the real bar code.
// Run from the repository root: npx -y tsx scripts/previews.ts
// The README shows PNG renders of these SVGs (2x, e.g. with a headless browser screenshot).
import { writeFileSync } from 'node:fs'

import { PALETTES, STYLES, barre, seuil } from '../hooks/barres'

const FONT = "Cascadia Mono, Consolas, 'DejaVu Sans Mono', Menlo, monospace"
const BG = '#1F1F1E'
const INK = '#E8E6E3'
const DIM = '#6F6D69'
const CLAUDE = '#D97757'
const FOLDER = '#8AB4F8'

type Span = { text: string; color: string; bold?: boolean }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function bar(label: string, styleId: string, paletteId: string, p: number): Span[] {
  return [
    { text: `${label} `, color: DIM },
    ...barre(styleId, paletteId, p).map(c => ({ text: c.ch, color: c.dim ? DIM : (c.color ?? INK) })),
    { text: ` ${Math.round(p)}%`, color: seuil(p), bold: true },
  ]
}

const sep: Span = { text: ' │ ', color: DIM }

function band(styleId: string, paletteId: string, v: { ctx: number; five: number; seven: number }): Span[] {
  return [
    { text: 'claude-opus-5-5', color: CLAUDE, bold: true },
    sep,
    ...bar('ctx', styleId, paletteId, v.ctx),
    sep,
    ...bar('5h', styleId, paletteId, v.five),
    { text: ' → 14:20 (in 2 h 13)', color: DIM },
    sep,
    ...bar('7d', styleId, paletteId, v.seven),
    sep,
    { text: '$13.49', color: INK },
    sep,
    { text: 'my-project', color: FOLDER },
  ]
}

function svg(rows: { caption?: string; spans: Span[] }[], width: number): string {
  const lineH = 30
  const capW = rows.some(r => r.caption) ? 330 : 0
  const height = rows.length * lineH + 28
  const lines = rows.map((r, i) => {
    const y = 34 + i * lineH
    const cap = r.caption ? `<text x="20" y="${y}" fill="${DIM}">${esc(r.caption)}</text>` : ''
    const tspans = r.spans
      .map(s => `<tspan fill="${s.color}"${s.bold ? ' font-weight="bold"' : ''}>${esc(s.text)}</tspan>`)
      .join('')
    return `${cap}<text x="${20 + capW}" y="${y}" xml:space="preserve">${tspans}</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" font-size="15">
<rect width="${width}" height="${height}" rx="12" fill="${BG}"/>
${lines.join('\n')}
</svg>
`
}

// every style, green → red palette
writeFileSync(
  'docs/styles.svg',
  svg(STYLES.map((s, i) => ({ caption: `${i + 1}. ${s.en}`, spans: bar('5h', s.id, 'degrade', 73) })), 720),
)

// every palette, solid blocks at 90 %
writeFileSync(
  'docs/palettes.svg',
  svg(PALETTES.map((c, i) => ({ caption: `${i + 1}. ${c.en}`, spans: bar('5h', 'blocs', c.id, 90) })), 720),
)

// full status bars, a few combinations
const combos: [string, string, { ctx: number; five: number; seven: number }][] = [
  ['segments', 'degrade', { ctx: 39, five: 37, seven: 54 }],
  ['blocs', 'ocean', { ctx: 62, five: 48, seven: 21 }],
  ['points', 'coucher', { ctx: 15, five: 83, seven: 66 }],
  ['ligne', 'seuil', { ctx: 45, five: 71, seven: 92 }],
  ['precise', 'violet', { ctx: 27, five: 58, seven: 34 }],
  ['batterie', 'menthe', { ctx: 81, five: 25, seven: 47 }],
  ['losanges', 'arcenciel', { ctx: 90, five: 64, seven: 12 }],
  ['classique', 'feu', { ctx: 33, five: 95, seven: 76 }],
]
writeFileSync('docs/combinations.svg', svg(combos.map(([s, c, v]) => ({ spans: band(s, c, v) })), 1240))
console.log('docs/styles.svg, docs/palettes.svg, docs/combinations.svg')
