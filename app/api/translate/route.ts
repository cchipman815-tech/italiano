import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

async function callClaude(prompt: string): Promise<{ ok: true; cleaned: string } | { ok: false; response: ReturnType<typeof NextResponse.json> }> {
  let message
  try {
    message = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return { ok: false, response: NextResponse.json({ error: msg }, { status: 500 }) }
  }
  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '{}'
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return { ok: true, cleaned }
}

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Claude API not configured' }, { status: 500 })
  }

  const { english, mode } = await req.json()
  if (!english?.trim()) {
    return NextResponse.json({ error: 'Missing english text' }, { status: 400 })
  }

  try {
    if (mode === 'word') {
      const italian = await translateText(english.trim())
      const safeEnglish = english.trim().replace(/"/g, '')
      const result = await callClaude(
        `Given the Italian word "${italian}" (English: "${safeEnglish}"), return ONLY valid JSON:\n{"article":"lo","gender":"m","plural":"gli zaini","grammarNote":"Uses lo/gli because it starts with z-"}\nRules: article is the definite singular form; gender is "m" or "f"; plural includes the definite article; grammarNote is one short sentence or empty string.`
      )
      if (!result.ok) return result.response
      try {
        const meta = JSON.parse(result.cleaned)
        return NextResponse.json({ italian, ...meta })
      } catch {
        return NextResponse.json({ error: 'Claude returned invalid JSON' }, { status: 500 })
      }
    }

    if (mode === 'sentence') {
      const italian = await translateText(english.trim())
      const safeEnglish = english.trim().replace(/"/g, '')
      const result = await callClaude(
        `English: "${safeEnglish}"\nItalian: "${italian}"\nReturn ONLY valid JSON with one field:\n{"literalNote":"Short explanation of what structurally changed, e.g. velocemente = a single adverb where English uses speak quickly"}\nKeep literalNote under 120 characters.`
      )
      if (!result.ok) return result.response
      try {
        const meta = JSON.parse(result.cleaned)
        return NextResponse.json({ italian, ...meta })
      } catch {
        return NextResponse.json({ error: 'Claude returned invalid JSON' }, { status: 500 })
      }
    }

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
