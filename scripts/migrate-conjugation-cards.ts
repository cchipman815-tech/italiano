/**
 * migrate-conjugation-cards.ts
 *
 * For every verb card that has conjugations JSONB data, creates 6 individual
 * flashcards (one per pronoun). Italian = the conjugated form, English =
 * derived by translating "[pronoun] [conjugated_form]" from Italian → English
 * via Google Translate (handles irregular verbs like essere/avere correctly).
 *
 * The original verb card is left untouched (kept as a reference/overview card).
 *
 * Run: npx tsx scripts/migrate-conjugation-cards.ts
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

// Pronouns in the order they appear in conjugations.present
const PRONOUNS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] as const
// The Italian pronoun to use when building the phrase for translation
const IT_PRONOUN_PHRASE: Record<string, string> = {
  'io':      'io',
  'tu':      'tu',
  'lui/lei': 'lui',
  'noi':     'noi',
  'voi':     'voi',
  'loro':    'loro',
}

async function translateItToEn(text: string): Promise<string> {
  const res = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'it', target: 'en', format: 'text' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Translation failed')
  return (data.data.translations[0].translatedText as string).trim()
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log('Fetching verb cards with conjugations…')

  const { data: verbCards, error } = await db
    .from('cards')
    .select('id, italian, english, set_id, conjugations')
    .not('conjugations', 'is', null)

  if (error) throw error
  console.log(`Found ${verbCards!.length} verb cards with conjugations.\n`)

  let totalCreated = 0
  let totalSkipped = 0

  for (const verb of verbCards!) {
    const present = verb.conjugations?.present
    if (!present) { totalSkipped++; continue }

    console.log(`→ ${verb.italian} (${verb.english})`)

    // Check which conjugation cards already exist for this verb
    const { data: existing } = await db
      .from('cards')
      .select('italian')
      .eq('set_id', verb.set_id)
      .in('italian', PRONOUNS.map(p => present[p]).filter(Boolean))

    const existingForms = new Set((existing ?? []).map((c: { italian: string }) => c.italian))

    for (const pronoun of PRONOUNS) {
      const itForm: string = present[pronoun]
      if (!itForm?.trim()) continue

      // Skip if a card with this exact Italian form already exists in the set
      if (existingForms.has(itForm)) {
        console.log(`   skip ${pronoun}: "${itForm}" already exists`)
        totalSkipped++
        continue
      }

      // Translate "io sono", "tu sei", "lui è" etc. from Italian → English
      const itPhrase = `${IT_PRONOUN_PHRASE[pronoun]} ${itForm}`
      const enPhrase = await translateItToEn(itPhrase)
      // Capitalise first letter
      const english = enPhrase.charAt(0).toUpperCase() + enPhrase.slice(1)

      const { error: insertError } = await db.from('cards').insert({
        set_id: verb.set_id,
        italian: itForm,
        english,
        enabled: true,
      })

      if (insertError) {
        console.error(`   ERROR ${pronoun} "${itForm}": ${insertError.message}`)
      } else {
        console.log(`   ✓ ${pronoun}: "${itForm}" → "${english}"`)
        totalCreated++
      }

      // Tiny delay to avoid hitting rate limits
      await sleep(100)
    }
  }

  console.log(`\nDone! Created ${totalCreated} cards, skipped ${totalSkipped}.`)
}

main().catch(console.error)
