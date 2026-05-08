/**
 * backfill-gender.ts
 *
 * Auto-detects gender for Italian noun cards by parsing the definite/indefinite
 * article that precedes the noun. Cards without a recognisable article (verbs,
 * adjectives, phrases, conjugation cards) are left with gender = null.
 *
 * Detection rules:
 *   Masculine: il, lo, i, gli, un, uno  (or starts with those + space)
 *   Feminine:  la, le, una, un'         (or starts with those + space)
 *   l' — ambiguous, skipped (left null)
 *
 * Run: npx tsx scripts/backfill-gender.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectGender(italian: string): 'm' | 'f' | null {
  const lower = italian.toLowerCase().trim()

  // Masculine articles: il, lo, un, uno, i, gli
  const masculine = ['il ', 'lo ', 'un ', 'uno ', 'gli ', 'i ']
  for (const art of masculine) {
    if (lower.startsWith(art)) return 'm'
  }

  // Feminine articles: la, le, una, un' (elided before vowel)
  const feminine = ['la ', 'le ', 'una ', "un'"]
  for (const art of feminine) {
    if (lower.startsWith(art)) return 'f'
  }

  return null
}

async function main() {
  console.log('Fetching all cards…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, conjugations')

  if (error) throw error
  console.log(`Loaded ${cards!.length} cards.\n`)

  const updates: Array<{ id: string; gender: 'm' | 'f' | null }> = []
  let detected = 0
  let skipped = 0

  for (const card of cards!) {
    // Skip conjugation cards (they're verb forms, not nouns)
    if (card.conjugations) { skipped++; continue }

    const gender = detectGender(card.italian)
    if (gender) {
      updates.push({ id: card.id, gender })
      detected++
    } else {
      skipped++
    }
  }

  console.log(`Detected gender for ${detected} cards, skipped ${skipped}.\n`)

  // Batch update in groups of 50
  let updated = 0
  for (const { id, gender } of updates) {
    const { error: err } = await db
      .from('cards')
      .update({ gender })
      .eq('id', id)

    if (err) {
      console.error(`Error updating ${id}:`, err.message)
    } else {
      updated++
    }
  }

  console.log(`✓ Updated ${updated} cards with gender.`)

  // Print a sample
  const masculine = updates.filter(u => u.gender === 'm').length
  const feminine = updates.filter(u => u.gender === 'f').length
  console.log(`  ${masculine} masculine, ${feminine} feminine`)
}

main().catch(console.error)
