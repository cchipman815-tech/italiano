/**
 * Path metadata for the Notte redesign: 4 paths → 19 topics.
 *
 * A path is stored as `sets.category`; a topic is a row in `sets` whose
 * `title` is the topic's Italian title. Values mirror the PATHS / MODES
 * tables in docs/design/notte-prototype.html.
 */

export interface Bilingual {
  it: string
  en: string
}

export type PathSlug = 'parole' | 'verbi' | 'descrivere' | 'frasi'
export type PathCategory = 'nouns' | 'verbs' | 'adjectives' | 'phrases'

export type StudyMode = 'flashcard' | 'quiz' | 'listening' | 'match' | 'sentences' | 'conjugations'

/** Icon names rendered by components/StudyIcons.tsx. */
export type IconName = 'cards' | 'verb' | 'spark' | 'quote' | 'quiz' | 'ear' | 'grid'

export type TopicSlug =
  | 'la-citta' | 'a-scuola' | 'la-famiglia' | 'al-bar' | 'la-casa'
  | 'irregolari' | 'verbi-are' | 'verbi-ere' | 'verbi-ire' | 'verbi-isc' | 'avere-fare'
  | 'aspetto' | 'carattere' | 'umore' | 'colori' | 'nazionalita'
  | 'saluti' | 'cortesia' | 'dove'

export interface TopicMeta {
  slug: TopicSlug
  /** Stored in `sets.title`. Also the topic sheet's heading. */
  title: string
  /** Short row label on the path page (e.g. "-are" under Verbi). */
  label: string
  /** English gloss. Stored in `sets.description`. */
  en: string
}

export interface PathMeta {
  slug: PathSlug
  category: PathCategory
  name: Bilingual
  blurb: Bilingual
  reviewAll: Bilingual
  icon: IconName
  /** Study modes in the order the topic sheet lists them. */
  modes: StudyMode[]
  /** Topics in display order. */
  topics: TopicMeta[]
}

export interface ModeMeta {
  name: Bilingual
  icon: IconName
  /** Route segment under /sets/[id]/. */
  route: string
  /** Minimum enabled cards before the mode can start. */
  minCards: number
}

/** Quiz, Ascolto and Abbina build 4-option rounds. */
export const MIN_CARDS_FOR_CHOICE_MODES = 4

export const MODES: Record<StudyMode, ModeMeta> = {
  flashcard:    { name: { it: 'Flashcard', en: 'Flashcards' },       icon: 'cards', route: 'flashcard',         minCards: 1 },
  quiz:         { name: { it: 'Quiz', en: 'Quiz' },                  icon: 'quiz',  route: 'quiz',              minCards: MIN_CARDS_FOR_CHOICE_MODES },
  listening:    { name: { it: 'Ascolto', en: 'Listening' },          icon: 'ear',   route: 'listening',         minCards: MIN_CARDS_FOR_CHOICE_MODES },
  match:        { name: { it: 'Abbina', en: 'Match' },               icon: 'grid',  route: 'match',             minCards: MIN_CARDS_FOR_CHOICE_MODES },
  sentences:    { name: { it: 'Frasi', en: 'Sentences' },            icon: 'quote', route: 'sentence-practice', minCards: 1 },
  conjugations: { name: { it: 'Coniugazioni', en: 'Conjugations' },  icon: 'verb',  route: 'conjugation',       minCards: 1 },
}

export const PATHS: PathMeta[] = [
  {
    slug: 'parole',
    category: 'nouns',
    name: { it: 'Parole', en: 'Words' },
    blurb: { it: 'con articolo e genere', en: 'with article and gender' },
    reviewAll: { it: 'Ripassa tutte le parole', en: 'Review all words' },
    icon: 'cards',
    modes: ['flashcard', 'quiz', 'listening', 'match', 'sentences'],
    topics: [
      { slug: 'la-citta',    title: 'La città',          label: 'La città',          en: 'In the city' },
      { slug: 'a-scuola',    title: 'A scuola',          label: 'A scuola',          en: 'At school' },
      { slug: 'la-famiglia', title: 'La famiglia',       label: 'La famiglia',       en: 'Family' },
      { slug: 'al-bar',      title: 'Al bar e a tavola', label: 'Al bar e a tavola', en: 'At the bar and at the table' },
      { slug: 'la-casa',     title: 'La casa',           label: 'La casa',           en: 'The house' },
    ],
  },
  {
    slug: 'verbi',
    category: 'verbs',
    name: { it: 'Verbi', en: 'Verbs' },
    blurb: { it: 'per coniugazione', en: 'by conjugation' },
    reviewAll: { it: 'Ripassa tutti i verbi', en: 'Review all verbs' },
    icon: 'verb',
    modes: ['conjugations', 'flashcard', 'quiz', 'match', 'sentences'],
    topics: [
      { slug: 'irregolari', title: 'Irregolari essenziali', label: 'Irregolari essenziali', en: 'Essential irregulars' },
      { slug: 'verbi-are',  title: 'Verbi in -are',         label: '-are',                  en: '-are verbs' },
      { slug: 'verbi-ere',  title: 'Verbi in -ere',         label: '-ere',                  en: '-ere verbs' },
      { slug: 'verbi-ire',  title: 'Verbi in -ire',         label: '-ire',                  en: '-ire verbs' },
      { slug: 'verbi-isc',  title: '-ire con -isc-',        label: '-ire con -isc-',        en: '-ire verbs with -isc-' },
      { slug: 'avere-fare', title: 'Con avere e fare',      label: 'Con avere e fare',      en: 'Idioms with avere and fare' },
    ],
  },
  {
    slug: 'descrivere',
    category: 'adjectives',
    name: { it: 'Descrivere', en: 'Describing' },
    blurb: { it: 'le quattro forme', en: 'all four forms' },
    reviewAll: { it: 'Ripassa tutti gli aggettivi', en: 'Review all adjectives' },
    icon: 'spark',
    modes: ['flashcard', 'quiz', 'match', 'sentences'],
    topics: [
      { slug: 'aspetto',     title: 'Aspetto',     label: 'Aspetto',     en: 'Appearance' },
      { slug: 'carattere',   title: 'Carattere',   label: 'Carattere',   en: 'Personality' },
      { slug: 'umore',       title: 'Umore',       label: 'Umore',       en: 'Mood' },
      { slug: 'colori',      title: 'Colori',      label: 'Colori',      en: 'Colors' },
      { slug: 'nazionalita', title: 'Nazionalità', label: 'Nazionalità', en: 'Nationalities' },
    ],
  },
  {
    slug: 'frasi',
    category: 'phrases',
    name: { it: 'Frasi', en: 'Phrases' },
    blurb: { it: 'per situazione', en: 'by situation' },
    reviewAll: { it: 'Ripassa tutte le frasi', en: 'Review all phrases' },
    icon: 'quote',
    modes: ['listening', 'sentences', 'flashcard', 'quiz'],
    topics: [
      { slug: 'saluti',   title: 'Saluti e presentazioni', label: 'Saluti e presentazioni', en: 'Greetings and introductions' },
      { slug: 'cortesia', title: 'Cortesia',               label: 'Cortesia',               en: 'Courtesy' },
      { slug: 'dove',     title: 'Dove?',                  label: 'Dove?',                  en: 'Where?' },
    ],
  },
]

export function getPath(slug: string): PathMeta | undefined {
  return PATHS.find(p => p.slug === slug)
}

export function getPathByCategory(category: string): PathMeta | undefined {
  return PATHS.find(p => p.category === category)
}

export function isPathSlug(value: unknown): value is PathSlug {
  return typeof value === 'string' && PATHS.some(p => p.slug === value)
}

export function isPathCategory(value: unknown): value is PathCategory {
  return typeof value === 'string' && PATHS.some(p => p.category === value)
}

/** Finds a seeded topic by slug, with the path it belongs to. */
export function getTopic(slug: string): { path: PathMeta; topic: TopicMeta } | undefined {
  for (const path of PATHS) {
    const topic = path.topics.find(t => t.slug === slug)
    if (topic) return { path, topic }
  }
  return undefined
}

export interface TopicCardCounts {
  /** Enabled cards in the topic. */
  activeCards: number
  /** Enabled cards that have present-tense conjugations. */
  conjugableCards: number
}

export type ModeAvailability =
  | { available: true }
  | { available: false; reason: Bilingual }

export function modeAvailability(mode: StudyMode, counts: TopicCardCounts): ModeAvailability {
  if (mode === 'conjugations') {
    return counts.conjugableCards > 0
      ? { available: true }
      : { available: false, reason: { it: 'Nessun verbo da coniugare', en: 'No verbs to conjugate' } }
  }

  const { minCards } = MODES[mode]
  if (counts.activeCards >= minCards) return { available: true }
  if (counts.activeCards === 0) {
    return { available: false, reason: { it: 'Nessuna carta attiva', en: 'No active cards' } }
  }
  const n = counts.activeCards
  return {
    available: false,
    reason: {
      it: `Servono almeno ${minCards} carte attive · ne hai ${n}`,
      en: `Needs at least ${minCards} active cards · you have ${n}`,
    },
  }
}

export interface TopicMode extends ModeMeta {
  mode: StudyMode
  availability: ModeAvailability
}

/** The topic sheet's mode list: the path's modes in order, each with its gate. */
export function modesForPath(slug: PathSlug, counts: TopicCardCounts): TopicMode[] {
  const path = getPath(slug)
  if (!path) return []
  return path.modes.map(mode => ({ mode, ...MODES[mode], availability: modeAvailability(mode, counts) }))
}
