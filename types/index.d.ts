export type Etat = {
  model: string
  folder: string
  ctx?: number
  fiveHour?: number
  /** Fin de la fenêtre de 5 h (remise à zéro du quota), en ms depuis 1970. */
  fiveHourReset?: number
  sevenDay?: number
  usd?: number
}

/** Langue du bandeau et des réponses des commandes. */
export type Lang = 'en' | 'fr'

declare module 'claude-code' {
  interface PluginState {
    'status-bar': {
      etat: Etat | null
      now: number
      /** Style de barre choisi (identifiant de STYLES). */
      style: string
      /** Palette de couleurs choisie (identifiant de PALETTES). */
      couleur: string
      lang: Lang
    }
  }
}
