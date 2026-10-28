// Styles de barre de progression et palettes de couleurs du bandeau.
// Une barre fait 10 cases ; chaque case est un caractère coloré, ou grisé quand elle est vide.

export type Case = { ch: string; color?: string; dim?: boolean }

type Style = {
  id: string
  nom: string
  // nom anglais
  en: string
  // cases de la barre pour un pourcentage, couleur(i) donnant la couleur de la case i
  cases: (p: number, couleur: (i: number) => string) => Case[]
}

type Palette = {
  id: string
  nom: string
  // nom anglais
  en: string
  // 10 couleurs, de la première case à la dernière ; absent : couleur selon le seuil
  couleurs?: string[]
}

const CASES = 10

// nombre de cases pleines : au moins une dès que le pourcentage n'est pas nul
const pleines = (p: number) => Math.min(CASES, Math.max(p > 0 ? 1 : 0, Math.round(p / 10)))

// une case pleine par glyphe plein, puis les vides grisées
function simple(plein: string | ((i: number) => string), vide: string | ((i: number) => string)) {
  const glyphe = (g: string | ((i: number) => string), i: number) => (typeof g === 'string' ? g : g(i))
  return (p: number, couleur: (i: number) => string): Case[] => {
    const n = pleines(p)
    return Array.from({ length: CASES }, (_, i) =>
      i < n ? { ch: glyphe(plein, i), color: couleur(i) } : { ch: glyphe(vide, i), dim: true },
    )
  }
}

const HAUTEURS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '█', '█']
const HUITIEMES = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

export const STYLES: Style[] = [
  { id: 'segments', nom: 'Segments', en: 'Segments', cases: simple('▰', '▱') },
  { id: 'blocs', nom: 'Blocs pleins', en: 'Solid blocks', cases: simple('█', '░') },
  { id: 'ligne', nom: 'Ligne fine', en: 'Thin line', cases: simple('━', '─') },
  { id: 'points', nom: 'Points', en: 'Dots', cases: simple('●', '○') },
  { id: 'carres', nom: 'Carrés', en: 'Squares', cases: simple('■', '□') },
  {
    id: 'precise',
    nom: 'Précise au 1/8', en: 'Precise (1/8)',
    cases: (p, couleur) => {
      const unites = Math.min(CASES, Math.max(0, p / 10))
      let pleins = Math.floor(unites)
      let reste = Math.round((unites - pleins) * 8)
      if (reste === 8) {
        pleins += 1
        reste = 0
      }
      const out: Case[] = []
      for (let i = 0; i < pleins; i++) out.push({ ch: '█', color: couleur(i) })
      if (reste > 0) out.push({ ch: HUITIEMES[reste] ?? '', color: couleur(pleins) })
      while (out.length < CASES) out.push({ ch: '░', dim: true })
      return out
    },
  },
  { id: 'escalier', nom: 'Escalier', en: 'Staircase', cases: simple(i => HAUTEURS[i] ?? '█', i => HAUTEURS[i] ?? '█') },
  { id: 'losanges', nom: 'Losanges', en: 'Diamonds', cases: simple('◆', '◇') },
  {
    id: 'classique',
    nom: 'Classique [===>]', en: 'Classic [===>]',
    cases: (p, couleur) => {
      const n = pleines(p)
      const out: Case[] = [{ ch: '[', dim: true }]
      for (let i = 0; i < CASES; i++)
        out.push(i < n ? { ch: i === n - 1 && n < CASES ? '>' : '=', color: couleur(i) } : { ch: ' ', dim: true })
      out.push({ ch: ']', dim: true })
      return out
    },
  },
  {
    id: 'batterie',
    nom: 'Batterie', en: 'Battery',
    cases: (p, couleur) => [{ ch: '▕', dim: true }, ...simple('█', ' ')(p, couleur), { ch: '▏', dim: true }],
  },
]

export const PALETTES: Palette[] = [
  { id: 'degrade', nom: 'Vert → rouge', en: 'Green → red', couleurs: ['#22C55E', '#4ADE80', '#A3E635', '#D9F99D', '#FACC15', '#FBBF24', '#F59E0B', '#F97316', '#EF4444', '#DC2626'] },
  { id: 'seuil', nom: 'Selon le seuil (vert, orange, rouge)', en: 'By threshold (green, orange, red)' },
  { id: 'ocean', nom: 'Océan', en: 'Ocean', couleurs: ['#67E8F9', '#22D3EE', '#06B6D4', '#0EA5E9', '#3B82F6', '#2563EB', '#4F46E5', '#4338CA', '#3730A3', '#312E81'] },
  { id: 'violet', nom: 'Violet', en: 'Purple', couleurs: ['#F0ABFC', '#E879F9', '#D946EF', '#C026D3', '#A855F7', '#9333EA', '#7E22CE', '#6D28D9', '#5B21B6', '#4C1D95'] },
  { id: 'coucher', nom: 'Coucher de soleil', en: 'Sunset', couleurs: ['#FDE047', '#FACC15', '#FDBA74', '#FB923C', '#F97316', '#F43F5E', '#E11D48', '#DB2777', '#C026D3', '#9333EA'] },
  { id: 'arcenciel', nom: 'Arc-en-ciel', en: 'Rainbow', couleurs: ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6'] },
  { id: 'menthe', nom: 'Menthe', en: 'Mint', couleurs: ['#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#10B981', '#059669', '#047857', '#0F766E', '#115E59', '#134E4A'] },
  { id: 'feu', nom: 'Feu', en: 'Fire', couleurs: ['#FEF08A', '#FDE047', '#FACC15', '#FBBF24', '#F59E0B', '#F97316', '#EA580C', '#DC2626', '#B91C1C', '#991B1B'] },
  { id: 'claude', nom: 'Claude (orange uni)', en: 'Claude (solid orange)', couleurs: Array<string>(CASES).fill('#D97757') },
]

export const STYLE_DEFAUT = 'segments'
export const PALETTE_DEFAUT = 'degrade'

// couleur d'un pourcentage : vert, puis orange à 50 %, rouge à 80 %
export const seuil = (p: number) => (p >= 80 ? '#EF4444' : p >= 50 ? '#F59E0B' : '#22C55E')

export const styleDe = (id: string) => STYLES.find(s => s.id === id) ?? STYLES[0]!
export const paletteDe = (id: string) => PALETTES.find(c => c.id === id) ?? PALETTES[0]!

export function barre(styleId: string, paletteId: string, p: number): Case[] {
  const couleurs = paletteDe(paletteId).couleurs
  return styleDe(styleId).cases(p, i => couleurs?.[i] ?? seuil(p))
}

// « 3 », « carres », « Carrés » ou « Squares » : l'élément choisi, sinon undefined
export function choisir<T extends { id: string; nom: string; en: string }>(liste: T[], saisie: string): T | undefined {
  const s = saisie.trim().replace(/^["'«»\s]+|["'«»\s]+$/g, '').toLowerCase()
  const n = Number(s)
  if (Number.isInteger(n) && n >= 1 && n <= liste.length) return liste[n - 1]
  const sansAccent = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return liste.find(e => e.id === s || sansAccent(e.nom) === sansAccent(s) || e.en.toLowerCase() === s)
}

// aperçu texte (sans couleur) d'une barre à 73 %, pour les listes des commandes
export const apercu = (styleId: string) => styleDe(styleId).cases(73, () => '').map(c => c.ch).join('')
