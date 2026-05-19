'use client'
import { useState } from 'react'
import type { SavedTranslation } from '@/lib/types'

interface Props {
  initialItems: SavedTranslation[]
}

export default function SavedTranslationsList({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
    await fetch(`/api/saved-translations/${id}`, { method: 'DELETE' })
  }

  if (items.length === 0) {
    return (
      <p className="text-qz-secondary text-sm">
        No saved translations yet — use Quick Translate on the home screen to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white rounded-2xl border-2 border-qz-border px-5 py-4 flex items-center justify-between"
          style={{ boxShadow: 'var(--qz-shadow-card)' }}
        >
          <div>
            <p className="text-lg font-bold text-qz-text">{item.italian}</p>
            <p className="text-sm text-qz-secondary">{item.english}</p>
          </div>
          <button
            onClick={() => void handleDelete(item.id)}
            className="ml-4 text-qz-muted hover:text-red-500 transition-colors text-xl leading-none cursor-pointer shrink-0"
            aria-label="Remove saved translation"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
