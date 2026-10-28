import { expect, test } from 'claude-code/testing'

import { NIVEAUX, ajuster, largeur, ligne } from '../hooks/ligne'
import type { Donnees } from '../hooks/ligne'

const D: Donnees = {
  model: 'claude-opus-5-5',
  folder: 'ERP_Unifie',
  ctx: 39,
  fiveHour: 37,
  reset: { heure: '14:20', reste: '2 h 13' },
  sevenDay: 54,
  usd: 13.49,
  style: 'segments',
  palette: 'degrade',
  fr: true,
}

const texte = (cols: number) => ajuster(D, cols).map(m => m.text).join('')

test('assez de place : tout est affiché', () => {
  const t = texte(200)
  expect(t).toContain('claude-opus-5-5')
  expect(t).toContain('(dans 2 h 13)')
  expect(t).toContain('$13.49')
  expect(t).toContain('ERP_Unifie')
})

test('chaque étape est plus courte que la précédente', () => {
  const l = NIVEAUX.map(n => largeur(ligne(D, n)))
  for (let i = 1; i < l.length; i++) expect(l[i]! < l[i - 1]!).toBe(true)
})

test('la ligne tient dans la largeur dès qu\'une étape le permet', () => {
  const minimum = largeur(ligne(D, NIVEAUX[NIVEAUX.length - 1]!))
  for (let cols = minimum; cols <= 200; cols += 7) expect(largeur(ajuster(D, cols)) <= cols).toBe(true)
})

test('le temps restant part en premier, puis le préfixe du modèle, puis le dossier', () => {
  const plein = largeur(ligne(D, NIVEAUX[0]!))
  expect(texte(plein - 1)).not.toContain('(dans')
  expect(texte(plein - 1)).toContain('→ 14:20')
  const sansReste = largeur(ligne(D, NIVEAUX[1]!))
  expect(texte(sansReste - 1)).toContain('opus-5-5')
  expect(texte(sansReste - 1)).not.toContain('claude-')
  const modeleCourt = largeur(ligne(D, NIVEAUX[2]!))
  expect(texte(modeleCourt - 1)).not.toContain('ERP_Unifie')
})

test('très étroit : pourcentages seuls, sans barres', () => {
  expect(texte(10)).toBe('opus-5-5 │ ctx 39% │ 5h 37% → 14:20 │ 7j 54%')
})

test("dans l'app, les cases comptent plus large : la ligne se resserre plus tôt", () => {
  const cols = largeur(ligne(D, NIVEAUX[0]!))
  expect(ajuster(D, cols).map(m => m.text).join('')).toContain('(dans 2 h 13)')
  expect(ajuster(D, cols, true).map(m => m.text).join('')).not.toContain('(dans 2 h 13)')
  expect(largeur(ajuster(D, 120, true), true) <= 120 * 0.85).toBe(true)
})
