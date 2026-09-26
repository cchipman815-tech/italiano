'use client'
import { useState, type KeyboardEvent } from 'react'
import type { ConjugationForms, Pronoun } from '@/lib/types'
import type { Bilingual, PathSlug } from '@/lib/paths'
import { PRONOUNS } from '@/lib/forms'
import { conjugateRegular, genderOfArticle, looksLikeInfinitive, type NewCard } from '@/lib/cards'
import { cardFromSaved, splitArticle } from '@/lib/saved'
import { t } from '@/lib/i18n'
import Sheet from './Sheet'
import { Icon } from './StudyIcons'
import Bi from './Bi'

const CATEGORY: Record<PathSlug, string> = { parole: 'nouns', verbi: 'verbs', descrivere: 'adjectives', frasi: 'phrases' }

interface Found {
  /** The Italian as translated, article included ("la panetteria"). */
  italian: string
  article: string | null
  gender: 'm' | 'f' | null
  plural: string | null
  isVerb: boolean
}

/**
 * Aggiungi carta: type the English, Traduci fills the Italian (in Parole it
 * also finds the article, gender and plural); a verb can bring its six
 * present-tense forms, switched off until the learner turns them on.
 */
export default function AddCardSheet({
  open,
  onClose,
  path,
  chapter,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  path: PathSlug | null
  /** The topic's chapter, given to the new card. */
  chapter: number | null
  /** Creates the card; resolves false if that failed. */
  onAdd: (card: NewCard) => Promise<boolean>
}) {
  // A fresh form every time the sheet opens.
  const [round, setRound] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setRound(r => r + 1)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Aggiungi carta"
      detents={[0.8]}
      header={(
        <div className="nm-sh-h">
          <div className="ser"><Bi k="addCard" /></div>
          <small className="nm-x"><Bi k="addCardHint" /></small>
        </div>
      )}
    >
      <AddCardForm key={round} path={path} chapter={chapter} onAdd={onAdd} onDone={onClose} />
    </Sheet>
  )
}

function AddCardForm({
  path,
  chapter,
  onAdd,
  onDone,
}: {
  path: PathSlug | null
  chapter: number | null
  onAdd: (card: NewCard) => Promise<boolean>
  onDone: () => void
}) {
  const [english, setEnglish] = useState('')
  const [italian, setItalian] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [withForms, setWithForms] = useState(true)
  const [busy, setBusy] = useState<null | 'translate' | 'add'>(null)
  const [error, setError] = useState<{ text: Bilingual; field: 'en' | 'it' | null } | null>(null)
  const category = path ? CATEGORY[path] : 'general'
  const nouns = path === 'parole'

  async function translate() {
    const en = english.trim()
    setError(null)
    if (!en) {
      setError({ text: t('typeWordEn'), field: 'en' })
      document.getElementById('ad-en')?.focus()
      return
    }
    setBusy('translate')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: en, mode: nouns ? 'word' : 'translate' }),
      })
      const data = await res.json() as { italian?: string; article?: string; gender?: string; plural?: string; isVerb?: boolean }
      if (!res.ok || !data.italian) throw new Error('No translation')
      const split = cardFromSaved({ italian: data.italian, english: en }, category)
      const gender = data.gender === 'm' || data.gender === 'f' ? data.gender : split.gender
      const next: Found = {
        italian: data.italian,
        article: nouns ? split.article ?? data.article ?? null : null,
        gender: nouns ? gender : null,
        plural: nouns ? data.plural?.trim() || null : null,
        isVerb: (path === 'verbi' || (!nouns && Boolean(data.isVerb))) && looksLikeInfinitive(data.italian),
      }
      setFound(next)
      // The article stays in view here; it's split off into its own field when the card is saved.
      setItalian(nouns && split.article ? `${split.article}${split.article.endsWith("'") ? '' : ' '}${split.italian}` : data.italian)
    } catch {
      setFound(null)
      setError({ text: t('typeItYourself'), field: null })
      document.getElementById('ad-it')?.focus()
    } finally {
      setBusy(null)
    }
  }

  async function formsFor(it: string, en: string): Promise<ConjugationForms | null> {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english: en, mode: 'conjugations' }),
      })
      const data = await res.json() as { conjugations?: { pronoun: Pronoun; italian: string }[] }
      if (res.ok && data.conjugations?.length === 6) {
        return Object.fromEntries(data.conjugations.map(f => [f.pronoun, f.italian.toLowerCase()])) as unknown as ConjugationForms
      }
    } catch { /* fall back to the regular pattern */ }
    return conjugateRegular(it)
  }

  async function add() {
    const it = italian.trim()
    const en = english.trim()
    setError(null)
    if (!it) {
      setError({ text: t('typeWordIt'), field: 'it' })
      document.getElementById('ad-it')?.focus()
      return
    }
    if (!en) {
      setError({ text: t('typeWordEn'), field: 'en' })
      document.getElementById('ad-en')?.focus()
      return
    }
    setBusy('add')
    const card: NewCard = { italian: it, english: en, enabled: true, chapter }
    const { word_type } = cardFromSaved({ italian: it, english: en }, category)
    if (word_type) card.word_type = word_type
    if (nouns) {
      // The field may have been edited, or typed with its article ("la panetteria").
      const typed = splitArticle(it)
      const article = typed.article ?? found?.article ?? null
      const untouched = found != null && typed.rest === splitArticle(found.italian).rest
      card.italian = typed.rest
      card.article = article
      card.gender = genderOfArticle(article) ?? (untouched ? found.gender : null)
      if (untouched && found.plural) card.plural = found.plural
    }
    if (found?.isVerb && withForms && it === found.italian) {
      const forms = await formsFor(it, en)
      if (forms) card.conjugations = { present: forms, off: [...PRONOUNS] }
    }
    const ok = await onAdd(card)
    setBusy(null)
    if (ok) onDone()
    else setError({ text: t('cantAddCard'), field: null })
  }

  function onEnter(e: KeyboardEvent<HTMLInputElement>, action: () => void) {
    if (e.key === 'Enter') {
      e.preventDefault()
      action()
    }
  }

  const chip = found?.gender && found.article
    ? `${found.article} · ${found.gender === 'f' ? 'femminile' : 'maschile'}`
    : null

  return (
    <>
      <div className="nm-scrl frm">
        <div className="fld sr">
          <label htmlFor="ad-en"><Bi k="english" /></label>
          <div className="ad-row">
            <input
              id="ad-en"
              className="nm-in"
              type="text"
              lang="en"
              placeholder="the bakery"
              autoComplete="off"
              enterKeyHint="go"
              value={english}
              aria-invalid={error?.field === 'en' || undefined}
              aria-describedby="ad-err"
              onChange={e => setEnglish(e.target.value)}
              onKeyDown={e => onEnter(e, () => void translate())}
            />
            <button type="button" className="mini" disabled={busy === 'translate'} onClick={() => void translate()}>
              <Bi k={busy === 'translate' ? 'translating' : 'translate'} itOnlyInMix />
            </button>
          </div>
        </div>
        <div className="fld sr">
          <label htmlFor="ad-it"><Bi k="italian" /></label>
          <input
            id="ad-it"
            className="nm-in"
            type="text"
            lang="it"
            autoComplete="off"
            enterKeyHint="done"
            value={italian}
            aria-invalid={error?.field === 'it' || undefined}
            aria-describedby="ad-err"
            onChange={e => setItalian(e.target.value)}
            onKeyDown={e => onEnter(e, () => void add())}
          />
        </div>
        {(chip || found?.plural) && (
          <div className="ad-meta fade-in">
            {chip && <span className="gch" lang="it">{chip}</span>}
            {found?.plural && <span className="plc" lang="it">pl. {found.plural}</span>}
          </div>
        )}
        {found?.isVerb && (
          <div className="ad-verb fade-in">
            <p className="nm-st"><Bi k="looksLikeVerb" /></p>
            <button type="button" className="nm-tog" role="switch" aria-checked={withForms} onClick={() => setWithForms(v => !v)}>
              <span className="nm-st"><Bi k="addForms" /></span>
              <span className="nm-sw2" />
            </button>
          </div>
        )}
        <p className="nm-err" id="ad-err" role="alert" hidden={!error}>
          {error && <><Icon name="x" size={15} strokeWidth={2.6} /><span className="nm-x"><Bi {...error.text} /></span></>}
        </p>
      </div>
      <button type="button" className="nm-cta on-ac sr" disabled={busy === 'add'} onClick={() => void add()}>
        <span className="nm-st"><Bi k="add" /></span>
        <span className="orb"><Icon name="plus" strokeWidth={2.2} /></span>
      </button>
    </>
  )
}
