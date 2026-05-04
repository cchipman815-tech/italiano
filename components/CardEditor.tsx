'use client'
import { useState } from 'react'
import type { Card } from '@/lib/types'

interface Props {
  card: Card
  onSave: (id: string, italian: string, english: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function CardEditor({ card, onSave, onDelete }: Props) {
  const [italian, setItalian] = useState(card.italian)
  const [english, setEnglish] = useState(card.english)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!italian.trim() || !english.trim()) return
    setSaving(true)
    await onSave(card.id, italian.trim(), english.trim())
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${card.italian}"?`)) return
    await onDelete(card.id)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-gray-100 group">
        <span className="flex-1 font-medium text-gray-900">{card.italian}</span>
        <span className="flex-1 text-gray-600">{card.english}</span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 transition-opacity cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-opacity cursor-pointer"
        >
          Delete
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100">
      <input
        value={italian}
        onChange={e => setItalian(e.target.value)}
        className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        placeholder="Italian"
      />
      <input
        value={english}
        onChange={e => setEnglish(e.target.value)}
        className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        placeholder="English"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs text-green-700 font-medium hover:text-green-900 disabled:opacity-50 cursor-pointer"
      >
        Save
      </button>
      <button
        onClick={() => { setItalian(card.italian); setEnglish(card.english); setEditing(false) }}
        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        Cancel
      </button>
    </div>
  )
}
