export interface User {
  id: number
  name: string
}

export interface Set {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  created_at: string
}

export interface Conjugations {
  present?: ConjugationForms
  past?: ConjugationForms
  future?: ConjugationForms
}

export interface ConjugationForms {
  io: string
  tu: string
  'lui/lei': string
  noi: string
  voi: string
  loro: string
}

export interface AdjForms {
  ms: string
  fs: string
  mp: string
  fp: string
}

export type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'expression'

export interface Card {
  id: string
  set_id: string
  italian: string
  english: string
  sort_order: number
  conjugations: Conjugations | null
  enabled: boolean
  gender?: 'm' | 'f' | null
  plural?: string | null
  example?: { italian: string; english: string } | null
  chapter?: number | null
  article?: string | null
  word_type?: WordType | null
  adjective_forms?: AdjForms | null
  tense?: string | null
}

export interface Progress {
  user_id: number
  card_id: string
  known: boolean
  last_seen_at: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review_at: string | null
}

export type Pronoun = keyof ConjugationForms

/** SRS state for one conjugation form of a verb card (migration 010). */
export interface ConjugationProgress {
  user_id: number
  card_id: string
  tense: string
  pronoun: Pronoun
  known: boolean
  last_seen_at: string
  interval: number
  ease_factor: number
  repetitions: number
  next_review_at: string | null
}

export interface SetWithProgress extends Set {
  total_cards: number
  known_cards: number
  due_cards?: number
  new_cards?: number
}

export interface SetWithCards extends Set {
  cards: Card[]
  progress: Progress[]
}

export interface SavedTranslation {
  id: string
  user_id: number
  english: string
  italian: string
  created_at: string
}
