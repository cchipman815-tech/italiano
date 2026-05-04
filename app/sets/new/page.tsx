'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSetPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const res = await fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, category }),
    })
    if (res.ok) {
      const set = await res.json()
      router.push(`/sets/${set.id}/edit`)
    } else {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link href="/home" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
        ← Cancel
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Set</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Common Verbs"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's in this set?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? 'Creating…' : 'Create Set'}
        </button>
      </form>
    </div>
  )
}
