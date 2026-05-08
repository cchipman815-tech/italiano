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
}

export interface Progress {
  user_id: number
  card_id: string
  known: boolean
  last_seen_at: string
}

export interface SetWithProgress extends Set {
  total_cards: number
  known_cards: number
}

export interface SetWithCards extends Set {
  cards: Card[]
  progress: Progress[]
}
