import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

async function translateText(text: string): Promise<string> {
  const res = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'en', target: 'it', format: 'text' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Translation failed')
  return data.data.translations[0].translatedText as string
}

// English conjugation templates keyed by pronoun
const EN_CONJUGATION_TEMPLATES = [
  { pronoun: 'io',      enTemplate: (v: string) => `I ${v}` },
  { pronoun: 'tu',      enTemplate: (v: string) => `you ${v}` },
  { pronoun: 'lui/lei', enTemplate: (v: string) => `he ${v}` },
  { pronoun: 'noi',     enTemplate: (v: string) => `we ${v}` },
  { pronoun: 'voi',     enTemplate: (v: string) => `you all ${v}` },
  { pronoun: 'loro',    enTemplate: (v: string) => `they ${v}` },
]

// Strip "to " prefix so "to have" → "have" for conjugation templates
function verbBase(english: string): string {
  return english.trim().toLowerCase().replace(/^to\s+/, '')
}

// Rough heuristic: single verb (with optional "to" prefix) = likely a verb
function looksLikeVerb(english: string): boolean {
  const cleaned = english.trim().toLowerCase().replace(/^to\s+/, '')
  // Single word with no spaces, no punctuation typical of phrases
  return /^[a-z]+$/.test(cleaned)
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Translation API not configured' }, { status: 500 })
  }

  const { english, mode } = await req.json()
  if (!english?.trim()) {
    return NextResponse.json({ error: 'Missing english text' }, { status: 400 })
  }

  try {
    if (mode === 'conjugations') {
      // Generate individual conjugation cards via translation
      const base = verbBase(english)
      const translations = await Promise.all(
        EN_CONJUGATION_TEMPLATES.map(async ({ pronoun, enTemplate }) => {
          const enPhrase = enTemplate(base)
          const itPhrase = await translateText(enPhrase)
          // Strip pronoun from Italian if Google includes it (e.g. "io ho" → "ho")
          const itWord = itPhrase.trim().split(/\s+/).pop()!
          return {
            pronoun,
            italian: itWord,
            english: enPhrase,
          }
        })
      )
      return NextResponse.json({ conjugations: translations })
    }

    // Default: simple word/phrase translation
    const italian = await translateText(english.trim())
    const isVerb = looksLikeVerb(english)
    return NextResponse.json({ italian, isVerb })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
