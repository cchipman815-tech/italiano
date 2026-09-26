'use client'
import { useEffect, useId, useRef, useState } from 'react'
import type { Card, ConjugationForms, Pronoun } from '@/lib/types'
import type { Bilingual, PathSlug } from '@/lib/paths'
import { plainText, t } from '@/lib/i18n'
import { PRONOUNS, activeForms } from '@/lib/forms'
import { conjugateRegular } from '@/lib/cards'
import { italianOf } from '@/lib/study'
import { reducedMotion } from '@/lib/motion'
import { useShell } from './Shell'
import { SpeakOrb } from './Speak'
import { Icon } from './StudyIcons'
import GenderBadge from './GenderBadge'
import Bi from './Bi'

export type CardPatch = Partial<Pick<Card, 'italian' | 'english' | 'enabled' | 'conjugations' | 'plural' | 'example'>>

const WORD_TYPE: Record<string, Bilingual> = {
  noun: { it: 'Nome', en: 'Noun' },
  verb: { it: 'Verbo', en: 'Verb' },
  adjective: { it: 'Aggettivo', en: 'Adjective' },
  phrase: { it: 'Frase', en: 'Phrase' },
  expression: { it: 'Espressione', en: 'Expression' },
}
const PATH_TYPE: Record<PathSlug, string> = { parole: 'noun', verbi: 'verb', descrivere: 'adjective', frasi: 'phrase' }
const ADJ_KEYS = ['ms', 'fs', 'mp', 'fp'] as const
const EMPTY_FORMS: ConjugationForms = { io: '', tu: '', 'lui/lei': '', noi: '', voi: '', loro: '' }

/**
 * One card in Modifica argomento. The switch turns it on or off for study;
 * tapping the word opens its details in place: plural or adjective forms,
 * the example (both can be generated), a verb's six forms with a switch
 * each, and Modifica / Coniuga / Elimina. Elimina asks inline first.
 */
export default function CardEditor({
  card,
  path,
  isNew,
  leaving,
  onPatch,
  onDelete,
}: {
  card: Card
  path: PathSlug | null
  /** Just added: the row flashes Ambra once. */
  isNew?: boolean
  /** Deleted: fading out before it's removed. */
  leaving?: boolean
  /** Saves fields (or, with `alreadySaved`, only shows them); resolves false when the save failed. */
  onPatch: (id: string, patch: CardPatch, alreadySaved?: boolean) => Promise<boolean>
  onDelete: (card: Card) => void
}) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const id = useId()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'acts' | 'edit' | 'confirm'>('acts')
  const [busy, setBusy] = useState<null | 'plural' | 'example' | 'conjugate' | 'save'>(null)
  const [error, setError] = useState<Bilingual | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)

  const on = card.enabled !== false
  const present = card.conjugations?.present ?? null
  const active = activeForms(card.conjugations)
  const type = card.word_type ?? (path ? PATH_TYPE[path] : null)
  const canConjugate = !present && (type === 'verb' || path === 'verbi')

  useEffect(() => {
    const box = mode === 'edit' ? editRef.current : mode === 'confirm' ? noRef.current?.parentElement : null
    if (!box) return
    ;(mode === 'edit' ? box.querySelector('input') : noRef.current)?.focus({ preventScroll: true })
    // Keep it clear of the Aggiungi carta bar (scroll-margin in app/edit.css).
    box.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [mode])

  function toggleOpen() {
    setOpen(o => !o)
    setMode('acts')
    setError(null)
  }

  async function generate(kind: 'plural' | 'example') {
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch(`/api/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, italian: card.italian, english: card.english }),
      })
      const data = await res.json() as { plural?: string; example?: Card['example']; error?: string }
      const value = kind === 'plural' ? data.plural : data.example
      if (!res.ok || !value) throw new Error(data.error ?? 'Nothing generated')
      // The route has saved it; this only updates the screen.
      void onPatch(card.id, kind === 'plural' ? { plural: data.plural } : { example: data.example }, true)
    } catch {
      setError(t('cantGenerate'))
    } finally {
      setBusy(null)
    }
  }

  async function conjugate() {
    setBusy('conjugate')
    setError(null)
    let forms: ConjugationForms | null = null
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: card.english, mode: 'conjugations' }),
      })
      const data = await res.json() as { conjugations?: { pronoun: Pronoun; italian: string }[] }
      if (res.ok && data.conjugations?.length === 6) {
        forms = { ...EMPTY_FORMS }
        for (const f of data.conjugations) forms[f.pronoun] = f.italian.toLowerCase()
      }
    } catch { /* fall back to the regular pattern */ }
    forms ??= conjugateRegular(card.italian)
    if (!forms) {
      setBusy(null)
      setError(t('cantConjugate'))
      return
    }
    // New forms start off; the learner turns on the ones to drill.
    await onPatch(card.id, { conjugations: { present: forms, off: [...PRONOUNS] } })
    setBusy(null)
  }

  function setForm(pronoun: Pronoun, isOn: boolean) {
    if (!present) return
    const off = new Set(card.conjugations?.off ?? [])
    if (isOn) off.delete(pronoun)
    else off.add(pronoun)
    void onPatch(card.id, { conjugations: { present, off: PRONOUNS.filter(p => off.has(p)) } })
  }

  const typeLabel = type ? WORD_TYPE[type] : null

  return (
    <div
      className={`ed-row${on ? '' : ' off'}${open ? ' open' : ''}${isNew ? ' new' : ''}${leaving ? ' leaving' : ''}`}
      data-card={card.id}
      data-flip={card.id}
    >
      <div className="ed-main">
        <button
          type="button"
          className="ed-sw"
          role="switch"
          aria-checked={on}
          aria-label={`${plainText(t('inReview'), imm)}: ${card.italian}`}
          onClick={() => void onPatch(card.id, { enabled: !on })}
        >
          <span className="nm-sw2" />
        </button>
        <button type="button" className="ed-open" aria-expanded={open} aria-controls={`${id}-d`} onClick={toggleOpen}>
          <span className="t">
            <b>
              <span className="ser" lang="it">{card.italian}</span>
              <GenderBadge gender={card.gender} article={card.article} className="sm" />
              {present && (
                <span className="pill tab-n nm-x">
                  <Bi it={`${active.length}/6 attive`} en={`${active.length}/6 on`} />
                </span>
              )}
            </b>
            <small>{card.english}</small>
          </span>
          <Icon name="chev" size={14} strokeWidth={2.4} className="chev" />
        </button>
      </div>

      <div className="ed-det" id={`${id}-d`} inert={!open}>
        <div className="ed-in">
          <div className="ed-pad">
            {present ? (
              <>
                <div className="ed-forms">
                  {PRONOUNS.map(p => (
                    <div key={p} className="ed-form">
                      <em>{p}</em>
                      <span lang="it">{present[p] || '—'}</span>
                      <button
                        type="button"
                        className="ed-sw"
                        role="switch"
                        aria-checked={active.includes(p)}
                        aria-label={`${plainText(t('formOn'), imm)}: ${present[p]}`}
                        disabled={!present[p]}
                        onClick={() => setForm(p, !active.includes(p))}
                      >
                        <span className="nm-sw2" />
                      </button>
                    </div>
                  ))}
                </div>
                {active.length < PRONOUNS.filter(p => present[p]).length && (
                  <button
                    type="button"
                    className="ed-gen"
                    onClick={() => void onPatch(card.id, { conjugations: { present } })}
                  >
                    <Bi k="turnAllOn" itOnlyInMix />
                  </button>
                )}
              </>
            ) : (
              <>
                {card.plural ? (
                  <div className="ed-kv fade-in"><em>pl.</em><b lang="it">{card.plural}</b></div>
                ) : card.gender ? (
                  <button type="button" className="ed-gen" disabled={busy === 'plural'} onClick={() => void generate('plural')}>
                    <Bi k={busy === 'plural' ? 'generating' : 'addPlural'} itOnlyInMix />
                  </button>
                ) : null}
                {card.adjective_forms && (
                  <div className="ed-adj">
                    {ADJ_KEYS.map(k => <span key={k}><em>{k}</em><b lang="it">{card.adjective_forms![k]}</b></span>)}
                  </div>
                )}
              </>
            )}

            {card.example ? (
              <div className="ed-ex fade-in"><i lang="it">{card.example.italian}</i><small>{card.example.english}</small></div>
            ) : (
              <button type="button" className="ed-gen" disabled={busy === 'example'} onClick={() => void generate('example')}>
                <Bi k={busy === 'example' ? 'generating' : 'addExample'} itOnlyInMix />
              </button>
            )}

            <div className="ed-fields nm-x">
              {typeLabel && <span className="fl"><em><Bi k="wordType" /></em><Bi {...typeLabel} /></span>}
              {card.article && <span className="fl"><em><Bi k="article" /></em><span lang="it">{card.article}</span></span>}
              <span className="fl"><em>Cap.</em>{card.chapter ?? '—'}</span>
            </div>

            {mode === 'edit' && (
              <EditBox
                card={card}
                boxRef={editRef}
                saving={busy === 'save'}
                onCancel={() => setMode('acts')}
                onSave={async patch => {
                  setBusy('save')
                  const ok = await onPatch(card.id, patch)
                  setBusy(null)
                  if (ok) setMode('acts')
                }}
              />
            )}

            {mode === 'acts' && (
              <div className="ed-acts nm-x">
                <SpeakOrb text={italianOf(card)} />
                <button type="button" className="ed-a" onClick={() => setMode('edit')}>
                  <Icon name="pen" size={15} strokeWidth={2} /><Bi k="edit" />
                </button>
                {canConjugate && (
                  <button type="button" className="ed-a" disabled={busy === 'conjugate'} onClick={() => void conjugate()}>
                    <Icon name="verb" size={15} strokeWidth={2} /><Bi k={busy === 'conjugate' ? 'conjugating' : 'conjugate'} />
                  </button>
                )}
                <button type="button" className="ed-a del" onClick={() => setMode('confirm')}>
                  <Icon name="trash" size={15} strokeWidth={2} /><Bi k="delete" />
                </button>
              </div>
            )}

            {mode === 'confirm' && (
              <div className="ed-confirm nm-x">
                <span><Bi k="deleteCardQ" /></span>
                <button ref={noRef} type="button" className="ed-a" onClick={() => setMode('acts')}><Bi k="cancel" /></button>
                <button type="button" className="ed-a solid" onClick={() => onDelete(card)}><Bi k="deleteCard" /></button>
              </div>
            )}

            {error && (
              <p className="nm-err" role="alert">
                <Icon name="x" size={15} strokeWidth={2.6} /><span className="nm-x"><Bi {...error} /></span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Modifica: the card's Italian and English, and a verb's six forms (Coniuga's guesses can need fixing). */
function EditBox({
  card,
  boxRef,
  saving,
  onCancel,
  onSave,
}: {
  card: Card
  boxRef: React.RefObject<HTMLDivElement | null>
  saving: boolean
  onCancel: () => void
  onSave: (patch: CardPatch) => void
}) {
  const [italian, setItalian] = useState(card.italian)
  const [english, setEnglish] = useState(card.english)
  const [forms, setForms] = useState<ConjugationForms | null>(card.conjugations?.present ?? null)

  function save() {
    if (!italian.trim() || !english.trim()) return
    const patch: CardPatch = { italian: italian.trim(), english: english.trim() }
    if (forms) patch.conjugations = { present: forms, ...(card.conjugations?.off?.length ? { off: card.conjugations.off } : {}) }
    onSave(patch)
  }

  return (
    <div className="ed-edit" ref={boxRef}>
      <label className="fld"><span className="lb"><Bi k="italian" /></span>
        <input className="nm-in" lang="it" value={italian} onChange={e => setItalian(e.target.value)} autoComplete="off" />
      </label>
      <label className="fld"><span className="lb"><Bi k="english" /></span>
        <input className="nm-in" lang="en" value={english} onChange={e => setEnglish(e.target.value)} autoComplete="off" />
      </label>
      {forms && (
        <div className="ed-grid">
          {PRONOUNS.map(p => (
            <label key={p} className="fld"><span className="lb">{p}</span>
              <input className="nm-in" lang="it" value={forms[p]} onChange={e => setForms({ ...forms, [p]: e.target.value })} autoComplete="off" />
            </label>
          ))}
        </div>
      )}
      <div className="ed-acts nm-x">
        <button type="button" className="ed-a" onClick={onCancel}><Bi k="cancel" /></button>
        <button type="button" className="ed-a pri" disabled={saving || !italian.trim() || !english.trim()} onClick={save}><Bi k="save" /></button>
      </div>
    </div>
  )
}
