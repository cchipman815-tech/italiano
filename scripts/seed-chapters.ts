/**
 * seed-chapters.ts
 * Seeds Prego chapter vocabulary into the Notte topic sets (lib/paths.ts).
 * Content lives in scripts/data/chapters.ts; each card keeps its `chapter`
 * tag and lands in its `topic`. Cards that already exist (same chapter,
 * word type and Italian) are skipped, and missing topic sets are created.
 *
 * Run: npx tsx scripts/seed-chapters.ts                        (dry run, all chapters)
 *      npx tsx scripts/seed-chapters.ts --chapter 7            (dry run, one chapter)
 *      npx tsx scripts/seed-chapters.ts --chapter 7 --confirm  (writes)
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { PATHS, getTopic, type TopicSlug } from '../lib/paths'
import { CHAPTERS, type SeedChapter } from './data/chapters'
import { cardKey } from './lib/regroup-plan'
dotenv.config({ path: '.env.local', quiet: true })

const CONFIRM = process.argv.includes('--confirm')

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const topicSetIds = new Map<TopicSlug, string>()

async function topicSetId(slug: TopicSlug): Promise<string> {
  const cached = topicSetIds.get(slug)
  if (cached) return cached

  const { path, topic } = getTopic(slug)!
  const { data: existing, error: findErr } = await db
    .from('sets')
    .select('id')
    .eq('category', path.category)
    .eq('title', topic.title)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) {
    topicSetIds.set(slug, existing.id)
    return existing.id
  }

  const sortOrder = PATHS.flatMap(p => p.topics).findIndex(t => t.slug === slug) + 1
  if (!CONFIRM) {
    console.log(`  would create topic set: ${topic.title}`)
    return `new:${slug}`
  }
  const { data: created, error } = await db
    .from('sets')
    .insert({ title: topic.title, description: topic.en, category: path.category, sort_order: sortOrder })
    .select('id')
    .single()
  if (error) throw error
  console.log(`  + topic set: ${topic.title}`)
  topicSetIds.set(slug, created.id)
  return created.id
}

async function nextSortOrder(setId: string): Promise<number> {
  if (setId.startsWith('new:')) return 1
  const { data, error } = await db
    .from('cards')
    .select('sort_order')
    .eq('set_id', setId)
    .order('sort_order', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data?.[0]?.sort_order ?? 0) + 1
}

async function seedChapter(chapterData: SeedChapter, existingKeys: Set<string>) {
  console.log(`\nSeeding: ${chapterData.title}`)
  let count = 0
  let skipped = 0

  for (const c of chapterData.cards) {
    if (existingKeys.has(cardKey({ chapter: chapterData.chapter, word_type: c.word_type, italian: c.italian }))) {
      skipped++
      continue
    }
    const setId = await topicSetId(c.topic)
    if (!CONFIRM) {
      console.log(`  would add ${c.italian} → ${getTopic(c.topic)!.topic.title}`)
      count++
      continue
    }
    const { error } = await db.from('cards').insert({
      set_id:          setId,
      italian:         c.italian,
      english:         c.english,
      word_type:       c.word_type,
      article:         c.article          ?? null,
      gender:          c.gender           ?? null,
      plural:          c.plural           ?? null,
      tense:           c.tense            ?? null,
      conjugations:    c.conjugations     ?? null,
      adjective_forms: c.adjective_forms  ?? null,
      chapter:         chapterData.chapter,
      sort_order:      await nextSortOrder(setId),
      enabled:         true,
    })
    if (error) {
      console.error(`  ✗ ${c.italian}: ${error.message}`)
    } else {
      count++
    }
    await sleep(30)
  }

  console.log(`  ✓ ${count}/${chapterData.cards.length} cards ${CONFIRM ? 'seeded' : 'to seed'}${skipped ? ` · ${skipped} already present` : ''}`)
  return count
}

async function main() {
  const chapterArg = process.argv.includes('--chapter')
    ? parseInt(process.argv[process.argv.indexOf('--chapter') + 1], 10)
    : null

  const toSeed = chapterArg
    ? CHAPTERS.filter(c => c.chapter === chapterArg)
    : CHAPTERS

  if (chapterArg && toSeed.length === 0) {
    console.error(`No data for chapter ${chapterArg}`)
    process.exit(1)
  }

  const { data: existing, error } = await db.from('cards').select('chapter, word_type, italian').range(0, 9999)
  if (error) throw error
  const existingKeys = new Set(existing.map(cardKey))

  if (!CONFIRM) console.log('DRY RUN: nothing is written. Pass --confirm to seed.')

  let totalCards = 0
  for (const chapterData of toSeed) {
    totalCards += await seedChapter(chapterData, existingKeys)
  }

  console.log(`\nDone. ${CONFIRM ? 'Seeded' : 'Would seed'} ${totalCards} cards from ${toSeed.length} chapter(s).`)
}

main().catch(err => { console.error(err); process.exit(1) })
