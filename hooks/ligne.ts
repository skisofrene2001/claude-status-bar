// Contenu du bandeau, toujours sur une seule ligne : quand la place manque, il se resserre
// par étapes (temps restant, nom du modèle, dossier, longueur des barres, coût, barres).

import { barre, seuil } from './barres'
import type { Case } from './barres'

export type Morceau = { text: string; color?: string; dim?: boolean; bold?: boolean }

export type Donnees = {
  model: string
  folder: string
  ctx?: number
  fiveHour?: number
  // heure de remise à zéro (« 14:20 ») et temps restant (« 2 h 13 »), déjà mis en forme
  reset?: { heure: string; reste: string }
  sevenDay?: number
  usd?: number
  style: string
  palette: string
  fr: boolean
}

type Niveau = {
  reste: boolean
  modeleCourt: boolean
  dossier: boolean
  barreCourte: boolean
  cout: boolean
  barres: boolean
}

const PLEIN: Niveau = { reste: true, modeleCourt: false, dossier: true, barreCourte: false, cout: true, barres: true }

// du plus complet au plus serré : chaque étape retire un peu plus
export const NIVEAUX: Niveau[] = [
  PLEIN,
  { ...PLEIN, reste: false },
  { ...PLEIN, reste: false, modeleCourt: true },
  { ...PLEIN, reste: false, modeleCourt: true, dossier: false },
  { ...PLEIN, reste: false, modeleCourt: true, dossier: false, barreCourte: true },
  { ...PLEIN, reste: false, modeleCourt: true, dossier: false, barreCourte: true, cout: false },
  { ...PLEIN, reste: false, modeleCourt: true, dossier: false, barreCourte: true, cout: false, barres: false },
]

// barre de 5 cases : une case sur deux, bords gardés (Classique, Batterie)
function courte(cases: Case[]): Case[] {
  const bords = cases.length > 10
  const milieu = bords ? cases.slice(1, -1) : cases
  const moitie = milieu.filter((_, i) => i % 2 === 1)
  return bords ? [cases[0]!, ...moitie, cases[cases.length - 1]!] : moitie
}

function pourcentage(d: Donnees, n: Niveau, label: string, p: number): Morceau[] {
  const cases = n.barres ? (n.barreCourte ? courte(barre(d.style, d.palette, p)) : barre(d.style, d.palette, p)) : []
  return [
    { text: `${label} `, dim: true },
    ...cases.map(c => (c.dim ? { text: c.ch, dim: true } : { text: c.ch, color: c.color })),
    { text: `${n.barres ? ' ' : ''}${Math.round(p)}%`, color: seuil(p), bold: true },
  ]
}

export function ligne(d: Donnees, n: Niveau): Morceau[] {
  const sep: Morceau = { text: ' │ ', dim: true }
  const out: Morceau[] = [{ text: n.modeleCourt ? d.model.replace(/^claude-/, '') : d.model, color: 'claude', bold: true }]
  if (d.ctx !== undefined) out.push(sep, ...pourcentage(d, n, 'ctx', d.ctx))
  if (d.fiveHour !== undefined) {
    out.push(sep, ...pourcentage(d, n, '5h', d.fiveHour))
    if (d.reset !== undefined)
      out.push({
        text: n.reste ? ` → ${d.reset.heure} (${d.fr ? 'dans' : 'in'} ${d.reset.reste})` : ` → ${d.reset.heure}`,
        dim: true,
      })
  }
  if (d.sevenDay !== undefined) out.push(sep, ...pourcentage(d, n, d.fr ? '7j' : '7d', d.sevenDay))
  if (n.cout && d.usd !== undefined) out.push(sep, { text: `$${d.usd.toFixed(2)}` })
  if (n.dossier) out.push(sep, { text: d.folder, color: 'suggestion' })
  return out
}

export const largeur = (morceaux: Morceau[]) => morceaux.reduce((n, m) => n + [...m.text].length, 0)

// la version la plus complète qui tient dans la largeur ; la plus serrée sinon
export function ajuster(d: Donnees, colonnes: number): Morceau[] {
  for (const n of NIVEAUX) {
    const l = ligne(d, n)
    if (largeur(l) <= colonnes) return l
  }
  return ligne(d, NIVEAUX[NIVEAUX.length - 1]!)
}
