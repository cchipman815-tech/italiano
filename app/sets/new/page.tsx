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

  const inputCls = "w-full border-2 border-qz-border rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link href="/home" className="text-sm text-qz-secondary hover:text-qz-text mb-6 inline-block transition-colors">
        ← Cancel
      </Link>
      <h1 className="text-2xl font-bold text-qz-text mb-6">New Set</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-qz-text mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Common Verbs" required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-qz-text mb-1">Description <span className="font-normal text-qz-secondary">(optional)</span></label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's in this set?" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-qz-text mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
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
          className="py-3 bg-qz-blue text-white font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? 'Creating…' : 'Create Set'}
        </button>
      </form>
    </div>
  )
}
