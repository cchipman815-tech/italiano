'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import CardEditor from '@/components/CardEditor'
import type { Card, Set } from '@/lib/types'

export default function EditSetPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [set, setSet] = useState<Set | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [newItalian, setNewItalian] = useState('')
  const [newEnglish, setNewEnglish] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/sets/${id}`)
      .then(r => r.json())
      .then(data => {
        setSet(data)
        setCards(data.cards)
        setTitle(data.title)
        setDescription(data.description ?? '')
        setCategory(data.category)
      })
  }, [id])

  async function handleSaveSet(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/sets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, category }),
    })
    setSaving(false)
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newItalian.trim() || !newEnglish.trim()) return
    const res = await fetch(`/api/sets/${id}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ italian: newItalian.trim(), english: newEnglish.trim() }),
    })
    if (res.ok) {
      const card = await res.json()
      setCards(prev => [...prev, card])
      setNewItalian('')
      setNewEnglish('')
    }
  }

  async function handleSaveCard(cardId: string, italian: string, english: string) {
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ italian, english }),
    })
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, italian, english } : c))
  }

  async function handleDeleteCard(cardId: string) {
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
    setCards(prev => prev.filter(c => c.id !== cardId))
  }

  async function handleDeleteSet() {
    if (!confirm(`Delete "${title}" and all its cards?`)) return
    await fetch(`/api/sets/${id}`, { method: 'DELETE' })
    router.push('/home')
  }

  if (!set) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/sets/${id}`} className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
        ← Back to set
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Set</h1>

      <form onSubmit={handleSaveSet} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex flex-col gap-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Set title"
          required
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Description (optional)"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="general">General</option>
          <option value="verbs">Verbs</option>
          <option value="nouns">Nouns</option>
          <option value="phrases">Phrases</option>
          <option value="numbers">Numbers</option>
          <option value="adjectives">Adjectives</option>
          <option value="alphabet">Alphabet</option>
          <option value="time">Time</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Cards ({cards.length})</h2>
        <div className="flex gap-2 mb-1 text-xs font-medium text-gray-500 px-1">
          <span className="flex-1">Italian</span>
          <span className="flex-1">English</span>
          <span className="w-20" />
        </div>
        {cards.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No cards yet — add one below</p>
        )}
        {cards.map(card => (
          <CardEditor
            key={card.id}
            card={card}
            onSave={handleSaveCard}
            onDelete={handleDeleteCard}
          />
        ))}
        <form onSubmit={handleAddCard} className="flex gap-2 mt-4">
          <input
            value={newItalian}
            onChange={e => setNewItalian(e.target.value)}
            placeholder="Italian"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            value={newEnglish}
            onChange={e => setNewEnglish(e.target.value)}
            placeholder="English"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={!newItalian.trim() || !newEnglish.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>

      <button
        onClick={handleDeleteSet}
        className="text-sm text-red-500 hover:text-red-700 transition-colors cursor-pointer"
      >
        Delete this set
      </button>
    </div>
  )
}
