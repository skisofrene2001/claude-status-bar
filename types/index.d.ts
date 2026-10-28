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

declare module 'claude-code' {
  interface PluginState {
    'barre-etat': { etat: Etat | null; now: number }
  }
}
