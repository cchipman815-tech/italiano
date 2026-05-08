/**
 * backfill-examples.ts
 *
 * Generates example sentences for cards that don't have one yet.
 * Skips cards with conjugations (they have a conjugation table as study content).
 *
 * Strategy: build an English template sentence, translate EN→IT via Google Translate,
 * save both as { italian, english } JSONB to cards.example.
 *
 * Run: npx tsx scripts/backfill-examples.ts
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

/**
 * Build a simple, natural English example sentence for a word/phrase.
 * Mirrors the logic in app/api/example/route.ts.
 */
function buildEnglishExample(english: string): string {
  const lower = english.toLowerCase().trim()

  // Verb (starts with "to "): "I [verb] every day."
  if (lower.startsWith('to ')) {
    const verb = lower.slice(3)
    return `I ${verb} every day.`
  }

  // Number: "There are [n] students in the class."
  if (/^\d+$/.test(lower)) {
    return `There are ${lower} students in the class.`
  }

  // Multi-word phrase without an article: wrap in quotes
  const words = lower.split(' ')
  if (words.length > 2 && !['the', 'a', 'an', 'il', 'la', 'lo', 'i', 'gli', 'le'].includes(words[0])) {
    return `We often say: "${english}".`
  }

  // Noun: "The [noun] is very nice."
  const noun = lower.replace(/^(the|a|an)\s+/i, '')
  if (noun.length < 15) {
    return `The ${noun} is very nice.`
  }

  // Fallback
  return `Can you use "${english}" in a sentence?`
}

async function main() {
  if (!API_KEY) throw new Error('GOOGLE_TRANSLATE_API_KEY is not set in .env.local')
  console.log('Fetching cards without examples…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, conjugations')
    .is('example', null)
    .order('sort_order')

  if (error || !cards) throw error ?? new Error('No data returned')
  console.log(`Found ${cards.length} cards without examples.\n`)

  // Skip conjugation cards
  const todo = cards.filter(c => !c.conjugations)
  const skipped = cards.length - todo.length
  console.log(`${skipped} conjugation cards skipped. Processing ${todo.length}…\n`)

  let success = 0
  let failed = 0

  for (const card of todo) {
    try {
      const englishSentence = buildEnglishExample(card.english)
      const italianSentence = await translateText(englishSentence)

      const example = { italian: italianSentence, english: englishSentence }

      const { error: err } = await db
        .from('cards')
        .update({ example })
        .eq('id', card.id)

      if (err) throw err

      console.log(`  ✓ ${card.italian} → "${italianSentence}"`)
      success++

      await sleep(100)
    } catch (err) {
      console.error(`  ✗ ${card.italian}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\n✓ ${success} examples generated, ${failed} failed, ${skipped} skipped.`)
}

main().catch(console.error)
