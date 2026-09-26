'use client'
import { useEffect, useRef, useState } from 'react'
import { label, plainText, t } from '@/lib/i18n'
import { joinArticle } from '@/lib/saved'
import LargeTitle from './LargeTitle'
import { useShell } from './Shell'
import { SpeakOrb } from './Speak'
import { Icon } from './StudyIcons'
import Bi from './Bi'

type Direction = 'en-it' | 'it-en'

export interface Translation {
  direction: Direction
  /** What to save and pronounce: nouns carry their article ("la stazione"). */
  italian: string
  english: string
  article?: string
  gender?: 'm' | 'f'
  plural?: string
  note?: string
}

type SaveState = { status: 'saving' | 'saved' | 'removed' | 'failed'; id?: string }

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'empty' }
  | { kind: 'error'; offline: boolean }
  | { kind: 'result'; result: Translation }

class HttpError extends Error {}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok || data.error) throw new HttpError(data.error ?? `HTTP ${res.status}`)
  return data
}

/** One request to /api/translate, shaped for the result card. Words and sentences use different modes. */
export async function requestTranslation(text: string, direction: Direction): Promise<Translation> {
  if (direction === 'it-en') {
    const data = await post<{ english?: string }>('/api/translate', { text, mode: 'it-en' })
    return { direction, italian: text, english: String(data.english ?? '') }
  }
  if (text.includes(' ')) {
    const data = await post<{ italian?: string; literalNote?: string }>('/api/translate', { english: text, mode: 'sentence' })
    return { direction, italian: String(data.italian ?? ''), english: text, note: data.literalNote || undefined }
  }
  const data = await post<{ italian?: string; article?: string; gender?: string; plural?: string; grammarNote?: string }>(
    '/api/translate', { english: text, mode: 'word' },
  )
  const article = data.article || undefined
  return {
    direction,
    italian: joinArticle(String(data.italian ?? ''), article),
    english: text,
    article,
    gender: article ? (data.gender === 'f' ? 'f' : 'm') : undefined,
    plural: data.plural || undefined,
    note: data.grammarNote || undefined,
  }
}

/**
 * Traduci: EN → IT or IT → EN. Every result saves itself to Salvate, with
 * Annulla right beside it; a failed request shows an error card with Riprova.
 */
export default function TranslateView() {
  const shell = useShell()
  const imm = shell?.prefs.imm ?? 'mix'
  const [direction, setDirection] = useState<Direction>('en-it')
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [save, setSave] = useState<SaveState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const outRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const request = useRef(0)

  // A new result or error rises in, then scrolls clear of the floating button.
  useEffect(() => {
    const card = outRef.current?.firstElementChild as HTMLElement | null
    if (!card || (phase.kind !== 'result' && phase.kind !== 'error')) return
    void card.offsetHeight
    card.classList.add('show')
    const over = card.getBoundingClientRect().bottom - ((ctaRef.current?.getBoundingClientRect().top ?? innerHeight) - 12)
    if (over > 0) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollBy({ top: over, behavior: reduce ? 'auto' : 'smooth' })
    }
  }, [phase])

  async function saveResult(result: Translation) {
    setSave({ status: 'saving' })
    try {
      const row = await post<{ id: string }>('/api/saved-translations', { english: result.english, italian: result.italian })
      setSave({ status: 'saved', id: row.id })
    } catch {
      setSave({ status: 'failed' })
    }
  }

  async function translate() {
    const q = text.trim()
    if (phase.kind === 'busy') return
    if (!q) {
      setPhase({ kind: 'empty' })
      inputRef.current?.focus()
      return
    }
    const id = ++request.current
    setPhase({ kind: 'busy' })
    setSave(null)
    try {
      const result = await requestTranslation(q, direction)
      if (id !== request.current) return
      setPhase({ kind: 'result', result })
      void saveResult(result)
    } catch (err) {
      if (id !== request.current) return
      setPhase({ kind: 'error', offline: !navigator.onLine || !(err instanceof HttpError) })
    }
  }

  /** Annulla removes the saved row; Salva puts it back. */
  async function toggleSaved(result: Translation) {
    if (save?.status === 'saved' && save.id) {
      const id = save.id
      setSave({ status: 'removed' })
      const res = await fetch(`/api/saved-translations/${id}`, { method: 'DELETE' }).catch(() => null)
      if (!res || (!res.ok && res.status !== 404)) setSave({ status: 'saved', id })
    } else if (save?.status === 'removed' || save?.status === 'failed') {
      await saveResult(result)
    }
  }

  function clear() {
    request.current++
    setText('')
    setPhase({ kind: 'idle' })
    setSave(null)
  }

  function chooseDirection(next: Direction) {
    if (next === direction) return
    setDirection(next)
    clear()
  }

  const busy = phase.kind === 'busy'
  const isSaved = save?.status === 'saving' || save?.status === 'saved'
  const placeholder = label(t(direction === 'en-it' ? 'typeEnglish' : 'typeItalian'), imm).text

  return (
    <>
      <LargeTitle title={t('translate')} sub={<Bi k="translateHint" />} />
      <div className="tr-wrap">
        <div className="nm-seg" role="group" aria-label={plainText(t('direction'), imm)}>
          <button type="button" aria-pressed={direction === 'en-it'} onClick={() => chooseDirection('en-it')}>EN → IT</button>
          <button type="button" aria-pressed={direction === 'it-en'} onClick={() => chooseDirection('it-en')}>IT → EN</button>
        </div>

        <div className="tr-box">
          <label className="sr-only" htmlFor="tr-in">{plainText(t('textToTranslate'), imm)}</label>
          <input
            ref={inputRef}
            id="tr-in"
            className="nm-in"
            type="text"
            lang={direction === 'en-it' ? 'en' : 'it'}
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={500}
            aria-invalid={phase.kind === 'empty' || undefined}
            aria-describedby={phase.kind === 'empty' ? 'tr-err' : undefined}
            onChange={e => { setText(e.target.value); if (phase.kind === 'empty') setPhase({ kind: 'idle' }) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void translate() } }}
          />
          {text && (
            <button type="button" className="tr-clr" aria-label={plainText(t('clear'), imm)} onClick={() => { clear(); inputRef.current?.focus() }}>
              <Icon name="x" size={16} strokeWidth={2.2} />
            </button>
          )}
          <i className={`tr-line${busy ? ' run' : ''}`} aria-hidden="true" />
        </div>

        {phase.kind === 'empty' && (
          <p id="tr-err" className="nm-err nm-x"><Icon name="x" size={15} strokeWidth={2.6} /><Bi k="typeSomething" /></p>
        )}

        <div ref={outRef} className="tr-out" aria-live="polite">
          {phase.kind === 'result' && (
            <ResultCard
              key={`${phase.result.direction}:${phase.result.italian}:${phase.result.english}`}
              result={phase.result}
              saved={isSaved}
              onToggleSaved={() => void toggleSaved(phase.result)}
            />
          )}
          {phase.kind === 'error' && (
            <div className="tr-card bad">
              <div className="tr-h">
                <b className="en"><Icon name="x" size={20} strokeWidth={2.4} /><Bi k="cantTranslate" itOnlyInMix /></b>
              </div>
              <p className="tr-note nm-st"><Bi k={phase.offline ? 'checkConnection' : 'somethingWrong'} /></p>
              <div className="tr-foot nm-x">
                <span />
                <button type="button" className="link-btn" onClick={() => void translate()}><Bi k="tryAgain" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="nm-float-space" />
      <div ref={ctaRef} className="nm-float">
        <button type="button" className="nm-cta on-ac" aria-busy={busy || undefined} onClick={() => void translate()}>
          <span className="nm-st"><Bi k={busy ? 'translating' : 'translate'} /></span>
          <span className="orb"><Icon name="arrow" strokeWidth={2.2} /></span>
        </button>
      </div>
    </>
  )
}

function ResultCard({ result, saved, onToggleSaved }: { result: Translation; saved: boolean; onToggleSaved: () => void }) {
  return (
    <div className="tr-card">
      {result.direction === 'it-en' ? (
        <>
          <div className="tr-src"><i lang="it">{result.italian}</i></div>
          <div className="tr-h"><b className="en">{result.english}</b><SpeakOrb text={result.italian} /></div>
        </>
      ) : (
        <div className="tr-h"><b className="ser" lang="it">{result.italian}</b><SpeakOrb text={result.italian} /></div>
      )}
      {result.article && (
        <div className="tr-chips">
          <span className="gch nm-x">
            <span lang="it">{result.article}</span>
            <span aria-hidden="true">·</span>
            <Bi k={result.gender === 'f' ? 'feminine' : 'masculine'} />
          </span>
          {result.plural && <span className="plc" lang="it">pl. {result.plural}</span>}
        </div>
      )}
      {result.note && <p className="tr-note">{result.note}</p>}
      <div className="tr-foot nm-x">
        <span className={`tr-saved${saved ? '' : ' off'}`}>
          <Icon name="check" size={16} strokeWidth={2.6} />
          <Bi k={saved ? 'savedToSaved' : 'notSaved'} />
        </span>
        <button type="button" className="link-btn" onClick={onToggleSaved}><Bi k={saved ? 'undo' : 'save'} /></button>
      </div>
    </div>
  )
}
