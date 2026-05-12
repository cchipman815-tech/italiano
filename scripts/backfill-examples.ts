/**
 * backfill-examples.ts
 *
 * Generates example sentences for cards that don't have one yet.
 * Uses Claude (Anthropic SDK) for accurate, beginner-appropriate Italian.
 *
 * Run: npx tsx scripts/backfill-examples.ts
 *      npx tsx scripts/backfill-examples.ts --dry-run   (list only, no API calls)
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const DRY_RUN = process.argv.includes('--dry-run')

const SYSTEM_PROMPT = `You are an Italian language tutor helping beginners study.
Generate one short, natural example sentence (5–10 words) using the given Italian word.
Use only present-tense vocabulary appropriate for Prego! Italian chapter 1–3 level.
No subjunctive, conditional, or complex tenses.
Respond with JSON only: {"italian":"<sentence>","english":"<translation>"}
No markdown, no explanation, no extra keys.`

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateExample(italian: string, english: string): Promise<{ italian: string; english: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Italian word: "${italian}" (English: "${english}")\nGenerate an example sentence using this word.`,
    }],
  })
  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(cleaned) as { italian: string; english: string }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set in .env.local')

  console.log('Fetching cards without examples…')
  const { data: cards, error } = await db
    .from('cards')
    .select('id, italian, english, conjugations, word_type')
    .is('example', null)
    .order('sort_order')

  if (error || !cards) throw error ?? new Error('No data returned')
  console.log(`Found ${cards.length} cards without examples.\n`)

  // Skip verb cards that have conjugation tables — they use the conjugation grid instead
  const todo = cards.filter(c => !c.conjugations)
  const skipped = cards.length - todo.length
  console.log(`${skipped} conjugation cards skipped. Processing ${todo.length}…\n`)

  if (DRY_RUN) {
    todo.forEach(c => console.log(`  would process: ${c.italian} (${c.english})`))
    console.log('\nDry run complete — no API calls made.')
    return
  }

  let success = 0
  let failed = 0

  for (const card of todo) {
    try {
      const example = await generateExample(card.italian, card.english)

      const { error: err } = await db
        .from('cards')
        .update({ example })
        .eq('id', card.id)

      if (err) throw err

      console.log(`  ✓ ${card.italian} → "${example.italian}"`)
      success++

      await sleep(200)
    } catch (err) {
      console.error(`  ✗ ${card.italian}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\n✓ ${success} examples generated, ${failed} failed, ${skipped} skipped.`)
}

main().catch(console.error)
