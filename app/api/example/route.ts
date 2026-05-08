import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!

/**
 * Generate a natural example sentence for a card and save it.
 *
 * Strategy:
 * 1. Construct an English template sentence using the English word.
 * 2. Translate it to Italian.
 * 3. Save both as { italian, english } JSONB.
 *
 * POST /api/example  { cardId, italian, english }
 * → { example: { italian: string, english: string } }
 */
async function translateText(text: string, source: string, target: string): Promise<string> {
  const res = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source, target, format: 'text' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Translation failed')
  return data.data.translations[0].translatedText as string
}

/**
 * Build a simple, natural English example sentence for a word/phrase.
 * Uses the English value directly in a sentence template.
 */
function buildEnglishExample(english: string): string {
  const lower = english.toLowerCase().trim()

  // Verb (starts with "to "): use "I [verb] every day."
  if (lower.startsWith('to ')) {
    const verb = lower.slice(3)
    return `I ${verb} every day.`
  }

  // Number or ordinal: use "There are [word] students in the class."
  if (/^\d+$/.test(lower)) {
    return `There are ${lower} students in the class.`
  }

  // Phrase (contains spaces, not a noun with article): wrap in a sentence
  const words = lower.split(' ')
  if (words.length > 2 && !['the', 'a', 'an', 'il', 'la', 'lo', 'i', 'gli', 'le'].includes(words[0])) {
    return `We often say: "${english}".`
  }

  // Noun (strip article): "The [noun] is on the table."
  const noun = lower.replace(/^(the|a|an)\s+/i, '')
  if (noun.length < 15) {
    return `The ${noun} is very nice.`
  }

  // Fallback
  return `Can you use "${english}" in a sentence?`
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { cardId, italian, english } = await req.json() as {
    cardId: string
    italian: string
    english: string
  }

  if (!cardId || !italian || !english) {
    return NextResponse.json({ error: 'cardId, italian, and english are required' }, { status: 400 })
  }

  try {
    const englishSentence = buildEnglishExample(english)
    const italianSentence = await translateText(englishSentence, 'en', 'it')

    const example = { italian: italianSentence, english: englishSentence }

    const db = createServerClient()
    const { error } = await db
      .from('cards')
      .update({ example })
      .eq('id', cardId)

    if (error) throw error

    return NextResponse.json({ example })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
