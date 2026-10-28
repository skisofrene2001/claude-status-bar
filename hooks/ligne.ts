// Contenu du bandeau, toujours sur une seule ligne : quand la place manque, il se resserre
// par étapes (temps restant, nom du modèle, dossier, longueur des barres, coût, barres).

import { barre, seuil } from './barres'
import type { Case } from './barres'

// barre : case d'une barre de progression (dessinée plus grande selon la hauteur choisie)
export type Morceau = { text: string; color?: string; dim?: boolean; bold?: boolean; barre?: boolean }

/** Hauteur des barres : 1 normale, 2 grande, 3 très grande (dans l'app ; le terminal n'a qu'une taille). */
export type Hauteur = 1 | 2 | 3

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
  hauteur: Hauteur
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
    ...cases.map(c => (c.dim ? { text: c.ch, dim: true, barre: true } : { text: c.ch, color: c.color, barre: true })),
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

// glyphes des barres et séparateurs : dans l'app (police proportionnelle) ils sont bien plus
// larges qu'une lettre ; au terminal, une colonne chacun
const LARGES = new Set([...'▰▱█░━─●○■□◆◇▁▂▃▄▅▆▇▏▎▍▌▋▊▉▕│→'])
const LARGEUR_APP = 1.8
// cases agrandies (hauteur 2 ou 3) : plus larges d'autant
export const ECHELLE: Record<Hauteur, number> = { 1: 1, 2: 1.4, 3: 1.8 }
// l'app : texte proportionnel, on garde une marge pour ne jamais passer à la ligne
const MARGE_APP = 0.85

export function largeur(morceaux: Morceau[], app = false, hauteur: Hauteur = 1): number {
  let n = 0
  for (const m of morceaux)
    for (const ch of m.text)
      n += app && LARGES.has(ch) ? LARGEUR_APP * (m.barre ? ECHELLE[hauteur] : 1) : 1
  return n
}

// la version la plus complète qui tient dans la largeur ; la plus serrée sinon.
// app : dessiné par Claude Desktop (police proportionnelle) plutôt que par un terminal
export function ajuster(d: Donnees, colonnes: number, app = false): Morceau[] {
  const place = app ? colonnes * MARGE_APP : colonnes
  for (const n of NIVEAUX) {
    const l = ligne(d, n)
    if (largeur(l, app, d.hauteur) <= place) return l
  }
  return ligne(d, NIVEAUX[NIVEAUX.length - 1]!)
}
