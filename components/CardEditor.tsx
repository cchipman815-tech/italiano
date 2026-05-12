'use client'
import { useState } from 'react'
import type { Card, ConjugationForms, WordType } from '@/lib/types'
import SpeakButton from '@/components/SpeakButton'
import GenderBadge from '@/components/GenderBadge'

interface Props {
  card: Card
  onSave: (
    id: string,
    fields: Partial<Pick<Card,
      'italian' | 'english' | 'conjugations' | 'enabled' | 'plural' | 'example' |
      'word_type' | 'article' | 'chapter' | 'tense' | 'adjective_forms'
    >>
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRONOUN_LABELS: (keyof ConjugationForms)[] = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']

export default function CardEditor({ card, onSave, onDelete }: Props) {
  const [italian, setItalian] = useState(card.italian)
  const [english, setEnglish] = useState(card.english)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConjugations, setShowConjugations] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [generatingPlural, setGeneratingPlural] = useState(false)
  const [generatingExample, setGeneratingExample] = useState(false)

  const [wordType, setWordType] = useState<string>(card.word_type ?? '')
  const [article, setArticle]   = useState(card.article ?? '')
  const [chapter, setChapter]   = useState<string>(card.chapter?.toString() ?? '')
  const [tense, setTense]       = useState(card.tense ?? 'present')
  const [adjForms, setAdjForms] = useState({
    ms: card.adjective_forms?.ms ?? '',
    fs: card.adjective_forms?.fs ?? '',
    mp: card.adjective_forms?.mp ?? '',
    fp: card.adjective_forms?.fp ?? '',
  })

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

  async function handleGeneratePlural() {
    setGeneratingPlural(true)
    try {
      const res = await fetch('/api/plural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, italian: card.italian, english: card.english }),
      })
      const data = await res.json()
      if (data.plural) {
        await onSave(card.id, { plural: data.plural })
      }
    } catch (err) {
      console.error('Failed to generate plural:', err)
    } finally {
      setGeneratingPlural(false)
    }
  }

  async function handleGenerateExample() {
    setGeneratingExample(true)
    try {
      const res = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, italian: card.italian, english: card.english }),
      })
      const data = await res.json()
      if (data.example) {
        await onSave(card.id, { example: data.example })
      }
    } catch (err) {
      console.error('Failed to generate example:', err)
    } finally {
      setGeneratingExample(false)
    }
  }

  async function handleSaveMetadata() {
    setSaving(true)
    await onSave(card.id, {
      word_type:       (wordType as WordType) || null,
      article:         article.trim() || null,
      chapter:         chapter ? parseInt(chapter, 10) : null,
      tense:           wordType === 'verb' ? tense : null,
      adjective_forms: wordType === 'adjective' && adjForms.ms ? adjForms : null,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${card.italian}"?`)) return
    await onDelete(card.id)
  }

  const metadataCount = (card.plural ? 1 : 0) + (card.example ? 1 : 0)

  return (
    <div className={`border-b border-qz-border py-2.5 ${!card.enabled ? 'opacity-50' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 group">
        {/* Toggle */}
        <button
          type="button"
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
            {/* Italian word */}
            <span className="flex-1 font-medium text-qz-text flex items-center gap-1.5 min-w-0">
              {card.italian}
              <GenderBadge gender={card.gender} size="sm" />
              <SpeakButton text={card.italian} size="sm" />
            </span>

            {/* English */}
            <span className="flex-1 text-qz-secondary min-w-0">{card.english}</span>

            {/* Expand button */}
            {metadataCount > 0 ? (
              <button
                type="button"
                aria-label={`${metadataCount} detail${metadataCount !== 1 ? 's' : ''}, ${expanded ? 'collapse' : 'expand'}`}
                aria-expanded={expanded}
                onClick={() => {
                  setExpanded(v => {
                    if (v) setShowConjugations(false) // close conjugation editor when collapsing
                    return !v
                  })
                }}
                className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-qz-blue bg-qz-blue-light px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
              >
                {metadataCount} {expanded ? '▾' : '▸'}
              </button>
            ) : (
              <button
                type="button"
                aria-label="More options"
                onClick={() => {
                  setExpanded(v => {
                    if (v) setShowConjugations(false) // close conjugation editor when collapsing
                    return !v
                  })
                }}
                className="flex-shrink-0 text-xs text-qz-secondary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer hover:text-qz-text"
              >
                ⋯
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
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
            </div>
            <button type="button" onClick={handleSaveText} disabled={saving} className="text-xs text-qz-blue font-semibold hover:text-qz-blue-dark disabled:opacity-50 cursor-pointer transition-colors flex-shrink-0">
              Save
            </button>
            <button type="button" onClick={() => { setItalian(card.italian); setEnglish(card.english); setEditing(false) }} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors flex-shrink-0">
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Expanded detail panel */}
      {expanded && !editing && (
        <div className="mt-2 ml-12 bg-qz-subtle border border-qz-border rounded-xl p-3">
          {/* Plural row */}
          {(card.plural || (card.gender && !card.conjugations)) && (
            <div className="flex items-center gap-3 mb-2">
              {card.plural && (
                <span className="text-xs text-qz-secondary">
                  pl. <span className="font-medium text-qz-text">{card.plural}</span>
                </span>
              )}
              {card.gender && !card.plural && !card.conjugations && (
                <button
                  type="button"
                  onClick={handleGeneratePlural}
                  disabled={generatingPlural}
                  className="text-xs text-qz-secondary hover:text-qz-text disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {generatingPlural ? 'generating…' : '+ plural'}
                </button>
              )}
            </div>
          )}

          {/* Example row */}
          {!card.conjugations && (
            <div className="flex items-center gap-3 mb-2">
              {card.example ? (
                <span className="text-xs text-green-600 font-medium">example ✓</span>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateExample}
                  disabled={generatingExample}
                  className="text-xs text-qz-secondary hover:text-qz-text disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {generatingExample ? 'generating…' : '+ example'}
                </button>
              )}
            </div>
          )}

          {/* Example sentence text */}
          {card.example && (
            <div className="text-xs text-qz-secondary italic border-l-2 border-qz-border pl-2 py-0.5 mb-3">
              <span className="not-italic font-medium text-qz-muted">ex. </span>
              {card.example.italian}
              <span className="not-italic text-qz-muted mx-1">·</span>
              {card.example.english}
            </div>
          )}

          {/* Metadata fields */}
          <div className="border-t border-qz-border pt-3 mt-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Type</label>
              <select
                value={wordType}
                onChange={e => setWordType(e.target.value)}
                className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
              >
                <option value="">—</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="phrase">Phrase</option>
                <option value="expression">Expression</option>
              </select>
            </div>

            {wordType === 'noun' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Article</label>
                <input
                  value={article}
                  onChange={e => setArticle(e.target.value)}
                  placeholder="il / la / lo / l'"
                  className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Chapter</label>
              <input
                type="number"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="1–18"
                min="1" max="18"
                className="w-20 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
              />
            </div>

            {wordType === 'verb' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-qz-secondary w-20 flex-shrink-0">Tense</label>
                <select
                  value={tense}
                  onChange={e => setTense(e.target.value)}
                  className="flex-1 border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
                >
                  <option value="present">Present</option>
                  <option value="past">Past</option>
                  <option value="future">Future</option>
                </select>
              </div>
            )}

            {wordType === 'adjective' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-qz-secondary">Adjective forms</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['ms', 'fs', 'mp', 'fp'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-qz-muted">{key}</label>
                      <input
                        value={adjForms[key]}
                        onChange={e => setAdjForms(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-qz-border rounded-lg px-2 py-1 text-xs text-qz-text bg-white focus:outline-none focus:border-qz-blue"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveMetadata}
              disabled={saving}
              className="self-start text-xs bg-qz-blue text-white px-3 py-1 rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save fields'}
            </button>
          </div>

          {/* Divider + actions */}
          <div className="border-t border-qz-border pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setExpanded(false); setEditing(true) }}
              className="text-xs text-qz-blue hover:text-qz-blue-dark font-medium cursor-pointer transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowConjugations(v => !v)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer transition-colors"
            >
              Conjugate
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer transition-colors ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      )}

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
              type="button"
              onClick={handleSaveConjugations}
              disabled={saving}
              className="text-xs bg-qz-blue text-white px-4 py-1.5 rounded-full hover:bg-qz-blue-dark disabled:opacity-50 cursor-pointer font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save Conjugations'}
            </button>
            <button type="button" onClick={() => setShowConjugations(false)} className="text-xs text-qz-secondary hover:text-qz-text cursor-pointer transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
