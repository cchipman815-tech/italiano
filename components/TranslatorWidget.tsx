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

type ItEnResult = {
  type: 'it-en'
  italian: string
  english: string
}

type TranslateResult = WordResult | SentenceResult | ItEnResult

export default function TranslatorWidget() {
  const [direction, setDirection] = useState<'en-it' | 'it-en'>('en-it')
  const [input,     setInput]     = useState('')
  const [result,    setResult]    = useState<TranslateResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function clearInput() {
    setInput('')
    setResult(null)
    setError('')
  }

  function handleDirectionChange(dir: 'en-it' | 'it-en') {
    setDirection(dir)
    clearInput()
  }

  async function handleTranslate() {
    const trimmed = input.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      if (direction === 'it-en') {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, mode: 'it-en' }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(errData.error ?? `HTTP ${res.status}`)
        }
        const data = await res.json() as { english?: string; error?: string }
        if (data.error) throw new Error(String(data.error))
        setResult({ type: 'it-en', italian: trimmed, english: String(data.english ?? '') })
      } else {
        const mode = trimmed.includes(' ') ? 'sentence' : 'word'
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const placeholder = direction === 'en-it'
    ? 'Type an English word or phrase…'
    : 'Type an Italian word or phrase…'

  const inputCls = 'w-full border-2 border-[#c5caff] rounded-xl px-3 py-2.5 text-qz-text text-sm placeholder:text-qz-secondary focus:outline-none focus:border-qz-blue transition-colors bg-white'

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: '#eef0ff', border: '1px solid #d5d9ff' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-qz-secondary uppercase tracking-wide">Quick Translate</p>
        <div className="flex gap-1 bg-white rounded-lg p-0.5 border border-[#d5d9ff]">
          <button
            onClick={() => handleDirectionChange('en-it')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              direction === 'en-it' ? 'bg-qz-blue text-white' : 'text-qz-secondary hover:text-qz-text'
            }`}
          >
            EN → IT
          </button>
          <button
            onClick={() => handleDirectionChange('it-en')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              direction === 'it-en' ? 'bg-qz-blue text-white' : 'text-qz-secondary hover:text-qz-text'
            }`}
          >
            IT → EN
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !loading && handleTranslate()}
            placeholder={placeholder}
            className={inputCls}
          />
          {input && (
            <button
              onClick={clearInput}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-qz-muted hover:text-qz-secondary transition-colors cursor-pointer text-lg leading-none"
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
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
        <div className="mt-4 bg-white border border-[#d5d9ff] rounded-xl p-4">
          {result.type === 'it-en' ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <SpeakButton text={result.italian} size="sm" />
                <span className="text-sm text-qz-secondary italic">{result.italian}</span>
              </div>
              <span className="text-2xl font-bold text-qz-text">{result.english}</span>
            </>
          ) : result.type === 'word' ? (
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
                <p className="text-sm text-qz-secondary italic">{result.literalNote}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
