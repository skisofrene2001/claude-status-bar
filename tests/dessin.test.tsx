import { expect, test } from 'claude-code/testing'

// Valeurs que le dessin lit, comme si le mod les avait déjà écrites.
const ETAT = {
  etat: {
    model: 'claude-opus-5-5',
    folder: 'ERP',
    ctx: 39,
    fiveHour: 37,
    fiveHourReset: 1_800_000_000_000,
    sevenDay: 54,
    usd: 13.49,
  },
  now: 1_800_000_000_000 - 2 * 3_600_000,
  style: 'points',
  couleur: 'seuil',
  lang: 'fr',
  hauteur: 3,
} as Record<string, unknown>

const BAND = {
  plugin: 'status-bar',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 200,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

test('le bandeau se dessine, dans l\'app comme au terminal', async ($, on) => {
  on('state.get', (_, e) => ({ value: { value: ETAT[e.key], version: 1 } }))

  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    // le bandeau entier : les morceaux de texte bout à bout
    const tout = (await ui.findAll({ type: 'Text' })).map(t => t.text ?? '').join('')
    expect(tout).toContain('opus-5-5')
    expect(tout).toContain('ctx')
    expect(tout).toContain('7j')
    await ui.unmount()
  }
})

test('hauteur 5 dans l\'app : cases en rectangles de 2 lignes', async ($, on) => {
  const etat: Record<string, unknown> = { ...ETAT, hauteur: 5 }
  on('state.get', (_, e) => ({ value: { value: etat[e.key], version: 1 } }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const boites = await ui.findAll({ type: 'Box' })
  // 3 barres de 10 cases, chacune un rectangle de 2 lignes de haut
  expect(boites.filter(b => b.props.height === 2).length).toBe(30)
  const tout = (await ui.findAll({ type: 'Text' })).map(t => t.text ?? '').join('')
  expect(tout).not.toContain('●')
  expect(tout).toContain('39%')
  await ui.unmount()
})
