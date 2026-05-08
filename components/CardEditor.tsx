'use client'
import { useState } from 'react'
import type { Card, ConjugationForms } from '@/lib/types'
import SpeakButton from '@/components/SpeakButton'

interface Props {
  card: Card
  onSave: (id: string, fields: Partial<Pick<Card, 'italian' | 'english' | 'conjugations' | 'enabled'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRONOUN_LABELS: (keyof ConjugationForms)[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']

export default function CardEditor({ card, onSave, onDelete }: Props) {
  const [italian, setItalian] = useState(card.italian)
  const [english, setEnglish] = useState(card.english)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConjugations, setShowConjugations] = useState(false)

  const presentForms = card.conjugations?.present ?? null
  const [conjugations, setConjugations] = useState<ConjugationForms>(
    presentForms ?? { io: '', tu: '', 'lui/lei': '', noi: '', voi: '', loro: '' }
  )

  async function handleToggleEnabled() {
    setSaving(true)
    await onSave(card.id, { enabled: !card.enabled })
    setSaving(false)
  }

  async function handleSaveText() {
    if (!italian.trim() || !english.trim()) return
    setSaving(true)
    await onSave(card.id, { italian: italian.trim(), english: english.trim() })
    setSaving(false)
    setEditing(false)
  }

  async function handleSaveConjugations() {
    const anyFilled = Object.values(conjugations).some(v => v.trim())
    const conjugationsPayload = anyFilled ? { present: conjugations } : null
    setSaving(true)
    await onSave(card.id, { conjugations: conjugationsPayload })
    setSaving(false)
    setShowConjugations(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${card.italian}"?`)) return
    await onDelete(card.id)
  }

  const hasConjugations = card.conjugations?.present &&
    Object.values(card.conjugations.present).some(v => v.trim())

  return (
    <div className={`border-b border-qz-border py-2.5 ${!card.enabled ? 'opacity-50' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 group">
        {/* Toggle */}
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          title={card.enabled ? 'Disable card' : 'Enable card'}
          className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            card.enabled ? 'bg-qz-blue' : 'bg-gray-500'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            card.enabled ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>

        {!editing ? (
          <>
            <span className="flex-1 font-medium text-qz-text flex items-center gap-1.5">
              {card.italian}
              <SpeakButton text={card.italian} size="sm" />
            </span>
            <span className="flex-1 text-qz-secondary">{card.english}</span>
            {hasConjugations && (
              <span className="text-xs text-qz-blue bg-qz-blue-light px-1.5 py-0.5 rounded-full font-medium">conjugated</span>
            )}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="text-xs text-qz-blue hover:text-qz-blue-dark font-medium cursor-pointer transition-colors">
                Edit
              </button>
              <button onClick={() => setShowConjugations(v => !v)} className="text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer transition-colors">
                Conjugate
              </button>
              <button onClick={handleDelete} className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer transition-colors">
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              value={italian}
              onChange={e => setItalian(e.target.value)}
              className="flex-1 border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors"
              placeholder="Italian"
            />
            <input
              value={english}
              onChange={e => setEnglish(e.target.value)}
              className="flex-1 border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors"
              placeholder="English"
            />
            <button onClick={handleSaveText} disabled={saving} className="text-xs text-qz-blue font-semibold hover:text-qz-blue-dark disabled:opacity-50 cursor-pointer transition-colors">
              Save
            </button>
            <button onClick={() => { setItalian(card.italian); setEnglish(card.english); setEditing(false) }} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors">
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Conjugation editor */}
      {showConjugations && (
        <div className="mt-2 ml-12 bg-qz-blue-light border-2 border-qz-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-qz-blue mb-3 uppercase tracking-wide">
            Present Tense Conjugations
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PRONOUN_LABELS.map(pronoun => (
              <div key={pronoun}>
                <label className="text-xs text-qz-secondary mb-0.5 block font-medium">{pronoun}</label>
                <input
                  value={conjugations[pronoun]}
                  onChange={e => setConjugations(prev => ({ ...prev, [pronoun]: e.target.value }))}
                  placeholder={pronoun === 'lui/lei' ? 'ha' : ''}
                  className="w-full border-2 border-qz-border rounded-lg px-2 py-1 text-sm text-qz-text placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveConjugations}
              disabled={saving}
              className="text-xs bg-qz-blue text-white px-4 py-1.5 rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save Conjugations'}
            </button>
            <button onClick={() => setShowConjugations(false)} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
