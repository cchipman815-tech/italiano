'use client'
import { useState } from 'react'
import SpeakButton from '@/components/SpeakButton'

type WordResult = {
  type: 'word'
  italian: string
  article: string
  gender: 'm' | 'f'
  plural: string
  grammarNote: string
}

type SentenceResult = {
  type: 'sentence'
  italian: string
  literalNote: string
}

type TranslateResult = WordResult | SentenceResult

export default function TranslatorWidget() {
  const [input,   setInput]   = useState('')
  const [result,  setResult]  = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleTranslate() {
    const trimmed = input.trim()
    if (!trimmed) return
    const mode = trimmed.includes(' ') ? 'sentence' : 'word'
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: trimmed, mode }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as Record<string, unknown>
      if (data.error) throw new Error(String(data.error))
      if (mode === 'word') {
        setResult({
          type: 'word',
          italian:     String(data.italian     ?? ''),
          article:     String(data.article     ?? ''),
          gender:      data.gender === 'f' ? 'f' : 'm',
          plural:      String(data.plural      ?? ''),
          grammarNote: String(data.grammarNote ?? ''),
        })
      } else {
        setResult({
          type: 'sentence',
          italian:     String(data.italian     ?? ''),
          literalNote: String(data.literalNote ?? ''),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'flex-1 border-2 border-qz-border rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white'

  return (
    <div className="bg-white rounded-2xl border-2 border-qz-border p-5 mb-6" style={{ boxShadow: 'var(--qz-shadow-sm)' }}>
      <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-3">🌐 Quick Translate</p>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
          onKeyDown={e => e.key === 'Enter' && !loading && handleTranslate()}
          placeholder="Type an English word or phrase…"
          className={inputCls}
        />
        <button
          onClick={handleTranslate}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-qz-blue text-white text-sm font-semibold rounded-full hover:bg-qz-blue-dark disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
        >
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {result && (
        <div className="mt-4 bg-qz-subtle border border-qz-border rounded-xl p-4">
          {result.type === 'word' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-qz-text">{result.italian}</span>
                <SpeakButton text={result.italian} />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {result.article && (
                  <span className="bg-qz-blue-light text-qz-blue text-xs font-semibold px-2.5 py-1 rounded-full">
                    {result.article}
                  </span>
                )}
                {result.article && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    result.gender === 'm' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {result.gender === 'm' ? 'masculine' : 'feminine'}
                  </span>
                )}
                {result.plural && (
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    pl. {result.plural}
                  </span>
                )}
              </div>
              {result.grammarNote && (
                <p className="text-xs text-qz-secondary italic">{result.grammarNote}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base font-semibold text-qz-text">{result.italian}</span>
                <SpeakButton text={result.italian} />
              </div>
              {result.literalNote && (
                <div className="bg-white border border-qz-border rounded-lg p-3">
                  <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide mb-1">
                    Literally in Italian structure
                  </p>
                  <p className="text-sm text-qz-text italic">{result.literalNote}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
