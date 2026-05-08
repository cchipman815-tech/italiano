/**
 * verify-translations.ts
 *
 * Translates every card's Italian text back to English via Google Translate
 * and compares it against the stored English. Flags mismatches.
 *
 * For conjugation cards (e.g. "ho" → "I have"), prepends the Italian pronoun
 * derived from the stored English so the API has enough context.
 *
 * Run: npx tsx scripts/verify-translations.ts
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
const BATCH_SIZE = 100

// Map English pronoun prefix → Italian pronoun for conjugation context
function italianPronoun(english: string): string | null {
  const e = english.toLowerCase()
  if (e.startsWith('i '))        return 'io'
  if (e.startsWith('you all '))  return 'voi'
  if (e.startsWith('you '))      return 'tu'
  if (e.startsWith('he ') || e.startsWith('she ')) return 'lui'
  if (e.startsWith('we '))       return 'noi'
  if (e.startsWith('they '))     return 'loro'
  return null
}

// Normalise for loose comparison: lowercase, strip punctuation, collapse spaces
function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\bto\b/g, '')      // ignore "to" prefix
    .replace(/\s+/g, ' ')
    .trim()
}

// Return true if the two strings are close enough to be considered matching
function isClose(stored: string, translated: string): boolean {
  const a = norm(stored)
  const b = norm(translated)
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  // Allow single-word variance (e.g. "I'm coming" vs "I'm arriving")
  const aWords = a.split(' ')
  const bWords = b.split(' ')
  const shared = aWords.filter(w => w.length > 2 && bWords.includes(w))
  const maxLen = Math.max(aWords.length, bWords.length)
  return shared.length / maxLen >= 0.6
}

async function translateBatch(texts: string[]): Promise<string[]> {
  const res = await fetch(`${TRANSLATE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, source: 'it', target: 'en', format: 'text' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Translation failed')
  return data.data.translations.map((t: { translatedText: string }) => t.translatedText)
}

async function main() {
  console.log('Fetching all cards…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, set_id, conjugations')
    .order('set_id')

  if (error) throw error
  console.log(`Loaded ${cards!.length} cards.\n`)

  // Build the list of Italian phrases to translate.
  // For conjugation cards, prepend Italian pronoun for context.
  const verbForms = new Map<string, Set<string>>()
  for (const c of cards!) {
    if (!c.conjugations?.present) continue
    const forms = new Set(Object.values(c.conjugations.present) as string[])
    verbForms.set(c.set_id, new Set([...(verbForms.get(c.set_id) ?? []), ...forms]))
  }

  const phrases: string[] = cards!.map(card => {
    const isConjugationCard =
      !card.conjugations &&
      verbForms.get(card.set_id)?.has(card.italian)

    if (isConjugationCard) {
      const pronoun = italianPronoun(card.english)
      return pronoun ? `${pronoun} ${card.italian}` : card.italian
    }
    return card.italian
  })

  // Translate in batches
  console.log(`Translating ${phrases.length} phrases in batches of ${BATCH_SIZE}…`)
  const translated: string[] = []
  for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
    const batch = phrases.slice(i, i + BATCH_SIZE)
    const results = await translateBatch(batch)
    translated.push(...results)
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, phrases.length)}/${phrases.length}\r`)
  }
  console.log('\nTranslation complete.\n')

  // Compare and collect issues
  const issues: Array<{ italian: string; stored: string; translated: string; phrase: string }> = []
  const ok: number[] = []

  for (let i = 0; i < cards!.length; i++) {
    const card = cards![i]
    const result = translated[i]
    if (isClose(card.english, result)) {
      ok.push(i)
    } else {
      issues.push({
        italian: card.italian,
        stored: card.english,
        translated: result,
        phrase: phrases[i],
      })
    }
  }

  console.log(`✓ ${ok.length} cards look correct`)
  console.log(`⚠️  ${issues.length} cards flagged for review\n`)

  if (issues.length > 0) {
    console.log('='.repeat(70))
    console.log('FLAGGED CARDS')
    console.log('='.repeat(70))
    for (const { italian, stored, translated, phrase } of issues) {
      console.log(`Italian  : ${phrase}`)
      console.log(`Stored   : ${stored}`)
      console.log(`Translated: ${translated}`)
      console.log('-'.repeat(50))
    }
  }
}

main().catch(console.error)
