/**
 * reset-content.ts
 * Deletes all sets and cards. Progress rows cascade-delete automatically.
 * Run: npx tsx scripts/reset-content.ts --confirm
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

if (!process.argv.includes('--confirm')) {
  console.error('Safety gate: pass --confirm to actually delete all content.')
  process.exit(1)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { count: cardCount, error: cardErr } = await db
    .from('cards')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (cardErr) throw cardErr

  const { count: setCount, error: setErr } = await db
    .from('sets')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (setErr) throw setErr

  console.log(`Deleted ${cardCount ?? 0} cards, ${setCount ?? 0} sets.`)
  console.log('Progress rows cascade-deleted automatically.')
}

main().catch(err => { console.error(err); process.exit(1) })
