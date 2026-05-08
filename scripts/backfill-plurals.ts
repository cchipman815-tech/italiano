/**
 * backfill-plurals.ts
 *
 * Generates Italian plural forms for noun cards that have a detected gender
 * (which implies they have an article and are nouns).
 *
 * Strategy: translate "the [english]s" from EN→IT via Google Translate,
 * then strip the Italian definite article to get the bare plural noun.
 *
 * Run: npx tsx scripts/backfill-plurals.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY!
const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

function stripArticle(italian: string): string {
  return italian
    .replace(/^(il|lo|la|i|gli|le|l')\s+/i, '')
    .trim()
}

function cleanEnglish(english: string): string {
  return english
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/^to\s+/i, '')
    .trim()
}

async function main() {
  console.log('Fetching noun cards (those with a gender)…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, gender, plural')
    .not('gender', 'is', null)  // only noun cards with detected gender
    .order('sort_order')

  if (error) throw error
  console.log(`Found ${cards!.length} noun cards.\n`)

  // Skip cards that already have a plural
  const todo = cards!.filter(c => !c.plural)
  const skipped = cards!.length - todo.length
  console.log(`${skipped} already have plurals. Processing ${todo.length}…\n`)

  let success = 0
  let failed = 0

  for (const card of todo) {
    try {
      const singularEnglish = cleanEnglish(card.english)
      const pluralPhrase = await translateText(`the ${singularEnglish}s`)
      const plural = stripArticle(pluralPhrase)

      const { error: err } = await db
        .from('cards')
        .update({ plural })
        .eq('id', card.id)

      if (err) throw err

      console.log(`  ${card.italian} → ${plural}`)
      success++

      await sleep(100)
    } catch (err) {
      console.error(`  ✗ ${card.italian}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\n✓ ${success} plurals generated, ${failed} failed.`)
}

main().catch(console.error)
