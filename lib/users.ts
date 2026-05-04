export const USERS = [
  { id: 1, name: 'Chance' },
  { id: 2, name: 'Jennifer' },
] as const

export type UserId = 1 | 2

export function isValidUserId(value: unknown): value is UserId {
  return value === 1 || value === 2
}

export function getUserById(id: UserId) {
  return USERS.find(u => u.id === id)!
}
