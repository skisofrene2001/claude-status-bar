import { expect, test } from 'claude-code/testing'

import { PALETTES, STYLES, barre, choisir, seuil } from '../hooks/barres'

test('chaque style dessine 10 cases (plus ses bords)', () => {
  for (const s of STYLES) {
    for (const p of [0, 7, 37, 73, 100]) {
      const cases = barre(s.id, 'degrade', p)
      const bords = s.id === 'classique' || s.id === 'batterie' ? 2 : 0
      expect(cases.length).toBe(10 + bords)
    }
  }
})

test('nombre de cases pleines selon le pourcentage', () => {
  const pleines = (p: number) => barre('segments', 'degrade', p).filter(c => !c.dim).length
  expect(pleines(0)).toBe(0)
  expect(pleines(3)).toBe(1)
  expect(pleines(37)).toBe(4)
  expect(pleines(100)).toBe(10)
})

test('précise au 1/8 : case partielle', () => {
  const texte = barre('precise', 'degrade', 73).map(c => c.ch).join('')
  expect(texte).toBe('███████▎░░')
})

test('classique : flèche au bout', () => {
  expect(barre('classique', 'degrade', 40).map(c => c.ch).join('')).toBe('[===>      ]')
})

test('palettes : 10 couleurs par case, ou couleur du seuil', () => {
  for (const c of PALETTES) {
    if (c.couleurs !== undefined) expect(c.couleurs.length).toBe(10)
  }
  const cases = barre('blocs', 'seuil', 85).filter(c => !c.dim)
  expect(cases.every(c => c.color === seuil(85))).toBe(true)
  expect(barre('blocs', 'ocean', 30)[0]?.color).toBe('#67E8F9')
})

test('choix par numéro, identifiant ou nom (accents ignorés)', () => {
  expect(choisir(STYLES, '5')?.id).toBe('carres')
  expect(choisir(STYLES, 'carres')?.id).toBe('carres')
  expect(choisir(STYLES, 'Carrés')?.id).toBe('carres')
  expect(choisir(PALETTES, 'ocean')?.id).toBe('ocean')
  expect(choisir(PALETTES, '11')).toBe(undefined)
})
