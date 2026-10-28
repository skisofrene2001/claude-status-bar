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
