'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import CardEditor from '@/components/CardEditor'
import SubpageBar from '@/components/SubpageBar'
import type { Card, Set as FlashSet } from '@/lib/types'

interface VerbGroup {
  verb: Card
  conjugations: Card[]
}

function buildGroups(cards: Card[]): { groups: VerbGroup[]; standalone: Card[] } {
  const verbCards = cards.filter(c => c.conjugations?.present)
  const conjugationIds = new Set<string>()

  const groups: VerbGroup[] = verbCards.map(verb => {
    const forms = new Set(Object.values(verb.conjugations!.present!))
    const children = cards.filter(c => !c.conjugations && forms.has(c.italian))
    children.forEach(c => conjugationIds.add(c.id))
    return { verb, conjugations: children }
  })

  const standalone = cards.filter(c => !conjugationIds.has(c.id) && !c.conjugations?.present)
  return { groups, standalone }
}

export default function EditSetPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [set, setSet] = useState<FlashSet | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [newItalian, setNewItalian] = useState('')
  const [newEnglish, setNewEnglish] = useState('')
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [conjugating, setConjugating] = useState(false)
  const [translateError, setTranslateError] = useState('')
  const [showConjugateHint, setShowConjugateHint] = useState(false)
  // Track which verb groups are expanded (collapsed by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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

  const { groups, standalone } = useMemo(() => buildGroups(cards), [cards])

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

  async function handleTranslate() {
    if (!newEnglish.trim()) return
    setTranslating(true)
    setTranslateError('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: newEnglish.trim(), mode: 'translate' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNewItalian(data.italian)
      setShowConjugateHint(!!data.isVerb)
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  async function handleAddConjugationCards() {
    if (!newEnglish.trim()) return
    setConjugating(true)
    setTranslateError('')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: newEnglish.trim(), mode: 'conjugations' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      for (const { italian, english } of data.conjugations) {
        const cardRes = await fetch(`/api/sets/${id}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ italian, english, enabled: false }),
        })
        if (cardRes.ok) {
          const card = await cardRes.json()
          setCards(prev => [...prev, card])
        }
      }
      setNewItalian('')
      setNewEnglish('')
      setShowConjugateHint(false)
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Failed to generate conjugation cards')
    } finally {
      setConjugating(false)
    }
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
      setShowConjugateHint(false)
    }
  }

  async function handleSaveCard(cardId: string, fields: Partial<Pick<Card, 'italian' | 'english' | 'conjugations' | 'enabled' | 'plural' | 'example'>>) {
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...fields } : c))
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

  async function handleToggleGroup(group: VerbGroup, enable: boolean) {
    const cardsToToggle = [group.verb, ...group.conjugations]
    await Promise.all(
      cardsToToggle.map(card =>
        fetch(`/api/cards/${card.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: enable }),
        })
      )
    )
    const ids = new Set(cardsToToggle.map(c => c.id))
    setCards(prev => prev.map(c => ids.has(c.id) ? { ...c, enabled: enable } : c))
  }

  function toggleExpanded(verbId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(verbId)) next.delete(verbId)
      else next.add(verbId)
      return next
    })
  }

  if (!set) return <div className="p-8 text-qz-secondary">Loading…</div>

  const inputCls = "w-full border-2 border-qz-border rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"

  return (
    <>
    <SubpageBar back={{ href: `/sets/${id}`, label: set.title }} />
    <div className="max-w-4xl mx-auto px-4 py-4">

      <h1 className="text-2xl font-bold text-qz-text mb-6">Edit Set</h1>

      {/* Set metadata form */}
      <form onSubmit={handleSaveSet} className="bg-white rounded-2xl border-2 border-qz-border p-5 mb-6 flex flex-col gap-3" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
        <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Set title" required />
        <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Description (optional)" />
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
        <button type="submit" disabled={saving} className="py-2.5 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer transition-colors">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Cards section */}
      <div className="bg-white rounded-2xl border-2 border-qz-border p-5 mb-4" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
        <h2 className="font-semibold text-qz-text mb-4">Cards ({cards.length})</h2>

        {/* Standalone (non-verb) cards */}
        {standalone.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 mb-1 text-xs font-semibold text-qz-secondary px-1 uppercase tracking-wide">
              <span className="flex-1">Italian</span>
              <span className="flex-1">English</span>
              <span className="w-20" />
            </div>
            {standalone.map(card => (
              <CardEditor key={card.id} card={card} onSave={handleSaveCard} onDelete={handleDeleteCard} />
            ))}
          </div>
        )}

        {/* Verb groups */}
        {groups.length > 0 && (
          <div className="flex flex-col gap-2">
            {standalone.length > 0 && <div className="border-t border-qz-border my-2" />}
            <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide px-1 mb-1">Verbs &amp; Conjugations</p>
            {groups.map(({ verb, conjugations }) => {
              const verbEnabled = verb.enabled !== false
              const enabledCount = (verbEnabled ? 1 : 0) + conjugations.filter(c => c.enabled !== false).length
              const total = 1 + conjugations.length
              const allEnabled = enabledCount === total
              const noneEnabled = enabledCount === 0
              const isExpanded = expandedGroups.has(verb.id)

              return (
                <div key={verb.id} className="border-2 border-qz-border rounded-2xl overflow-hidden">
                  {/* Verb header row */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-qz-subtle">
                    {/* Expand/collapse toggle */}
                    <button
                      onClick={() => toggleExpanded(verb.id)}
                      className="text-qz-secondary hover:text-qz-text transition-colors text-sm w-4 flex-shrink-0 cursor-pointer"
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>

                    {/* Verb name */}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-qz-text">{verb.italian}</span>
                      <span className="text-qz-secondary text-sm ml-2">{verb.english}</span>
                    </div>

                    {/* Enabled count badge */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      noneEnabled
                        ? 'bg-gray-100 text-qz-muted'
                        : allEnabled
                          ? 'bg-qz-blue-light text-qz-blue'
                          : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {enabledCount}/{total} on
                    </span>

                    {/* Toggle all button */}
                    <button
                      onClick={() => handleToggleGroup({ verb, conjugations }, noneEnabled ? true : false)}
                      className="text-xs font-semibold text-qz-blue hover:text-qz-blue-dark cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {noneEnabled ? 'Enable all' : 'Disable all'}
                    </button>
                  </div>

                  {/* Verb card + conjugation children (collapsible) */}
                  {isExpanded && (
                    <div className="px-4 divide-y divide-qz-border">
                      <CardEditor key={verb.id} card={verb} onSave={handleSaveCard} onDelete={handleDeleteCard} />
                      {conjugations.map(card => (
                        <CardEditor key={card.id} card={card} onSave={handleSaveCard} onDelete={handleDeleteCard} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {cards.length === 0 && (
          <p className="text-sm text-qz-secondary py-4 text-center">No cards yet — add one below</p>
        )}

        {/* Add card form */}
        <div className="mt-5 border-t border-qz-border pt-4">
          <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-3">Add a card</p>

          <div className="flex gap-2 mb-2">
            <input
              value={newEnglish}
              onChange={e => { setNewEnglish(e.target.value); setShowConjugateHint(false) }}
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              placeholder="English word or phrase"
              className="flex-1 border-2 border-qz-border rounded-xl px-3 py-2 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"
            />
            <button
              type="button"
              onClick={handleTranslate}
              disabled={!newEnglish.trim() || translating}
              className="px-4 py-2 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
            >
              {translating ? 'Translating…' : '🌐 Translate'}
            </button>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              value={newItalian}
              onChange={e => setNewItalian(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              placeholder="Italian (auto-filled or type manually)"
              className="flex-1 border-2 border-qz-border rounded-xl px-3 py-2 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"
            />
            <button
              type="button"
              onClick={handleAddCard}
              disabled={!newItalian.trim() || !newEnglish.trim()}
              className="px-4 py-2 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-40 cursor-pointer transition-colors"
            >
              Add
            </button>
          </div>

          {showConjugateHint && (
            <div className="flex items-center gap-3 mt-2 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-sm text-purple-800">
                Looks like a verb — add 6 individual conjugation cards instead?
              </span>
              <button
                type="button"
                onClick={handleAddConjugationCards}
                disabled={conjugating}
                className="ml-auto px-4 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-full hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition-colors whitespace-nowrap"
              >
                {conjugating ? 'Generating…' : 'Add Conjugations'}
              </button>
            </div>
          )}

          {translateError && (
            <p className="text-xs text-red-600 mt-2">{translateError}</p>
          )}
        </div>
      </div>

      <button onClick={handleDeleteSet} className="text-sm text-red-600 hover:text-red-800 transition-colors cursor-pointer">
        Delete this set
      </button>
    </div>
    </>
  )
}
