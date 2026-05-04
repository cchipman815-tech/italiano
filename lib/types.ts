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

export interface Card {
  id: string
  set_id: string
  italian: string
  english: string
  sort_order: number
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
