import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!

/**
 * Generate the Italian plural for a noun card and save it.
 *
 * Strategy: translate "the [english_word_plural]" into Italian,
 * then strip the article to get the bare plural form.
 *
 * POST /api/plural  { cardId, italian, english }
 * → { plural: string }
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
 * Strip definite articles from an Italian phrase to get the bare plural noun.
 * e.g. "i libri" → "libri", "le donne" → "donne", "gli studenti" → "studenti"
 */
function stripArticle(italian: string): string {
  return italian
    .replace(/^(il|lo|la|i|gli|le|l')\s+/i, '')
    .trim()
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
    // Translate Italian → English to confirm we have the singular English word,
    // then ask for the plural Italian by translating "the [english]s" back.
    // This handles irregular plurals better than rule-based approaches.
    const singularEnglish = english
      .replace(/^(the|a|an)\s+/i, '')  // strip any article
      .replace(/^to\s+/i, '')           // strip "to" from verbs
      .trim()

    // Translate "the [word]s" (or "the [word]es") from English → Italian
    // Google Translate handles the plural determination.
    const pluralPhrase = await translateText(`the ${singularEnglish}s`, 'en', 'it')

    const plural = stripArticle(pluralPhrase)

    // Save to DB
    const db = createServerClient()
    const { error } = await db
      .from('cards')
      .update({ plural })
      .eq('id', cardId)

    if (error) throw error

    return NextResponse.json({ plural })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
