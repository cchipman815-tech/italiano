/**
 * seed-chapters.ts
 * Seeds Prego chapter vocabulary sets and cards.
 * Run: npx tsx scripts/seed-chapters.ts            (all chapters)
 *      npx tsx scripts/seed-chapters.ts --chapter 2 (single chapter)
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'expression'

interface SeedCard {
  italian: string
  english: string
  word_type: WordType
  article?: string
  gender?: 'm' | 'f'
  plural?: string
  tense?: string
  conjugations?: { present: Record<string, string> }
  adjective_forms?: { ms: string; fs: string; mp: string; fp: string }
}

interface SeedSet {
  chapter: number
  title: string
  description: string
  sort_order: number
  cards: SeedCard[]
}

const CHAPTERS: SeedSet[] = [
  {
    chapter: 1,
    title: 'Chapter 1 — Una città italiana',
    description: 'Places, transport, greetings; avere; indefinite articles; noun gender/number',
    sort_order: 1,
    cards: [
      // Nouns — places & things
      { italian: 'università', english: 'university', word_type: 'noun', article: "l'", gender: 'f', plural: 'università' },
      { italian: 'duomo', english: 'cathedral', word_type: 'noun', article: 'il', gender: 'm', plural: 'duomi' },
      { italian: 'palazzo', english: 'building / palazzo', word_type: 'noun', article: 'il', gender: 'm', plural: 'palazzi' },
      { italian: 'piazza', english: 'square / plaza', word_type: 'noun', article: 'la', gender: 'f', plural: 'piazze' },
      { italian: 'stazione', english: 'station', word_type: 'noun', article: 'la', gender: 'f', plural: 'stazioni' },
      { italian: 'via', english: 'street', word_type: 'noun', article: 'la', gender: 'f', plural: 'vie' },
      { italian: 'bar', english: 'coffee bar / café', word_type: 'noun', article: 'il', gender: 'm', plural: 'bar' },
      { italian: 'caffè', english: 'coffee / café', word_type: 'noun', article: 'il', gender: 'm', plural: 'caffè' },
      { italian: 'ristorante', english: 'restaurant', word_type: 'noun', article: 'il', gender: 'm', plural: 'ristoranti' },
      { italian: 'albergo', english: 'hotel', word_type: 'noun', article: "l'", gender: 'm', plural: 'alberghi' },
      { italian: 'cinema', english: 'movie theater', word_type: 'noun', article: 'il', gender: 'm', plural: 'cinema' },
      { italian: 'museo', english: 'museum', word_type: 'noun', article: 'il', gender: 'm', plural: 'musei' },
      { italian: 'biblioteca', english: 'library', word_type: 'noun', article: 'la', gender: 'f', plural: 'biblioteche' },
      { italian: 'farmacia', english: 'pharmacy', word_type: 'noun', article: 'la', gender: 'f', plural: 'farmacie' },
      { italian: 'mercato', english: 'market', word_type: 'noun', article: 'il', gender: 'm', plural: 'mercati' },
      { italian: 'banca', english: 'bank', word_type: 'noun', article: 'la', gender: 'f', plural: 'banche' },
      { italian: 'teatro', english: 'theater', word_type: 'noun', article: 'il', gender: 'm', plural: 'teatri' },
      { italian: 'autobus', english: 'bus', word_type: 'noun', article: "l'", gender: 'm', plural: 'autobus' },
      { italian: 'centro', english: 'downtown / city center', word_type: 'noun', article: 'il', gender: 'm', plural: 'centri' },
      { italian: 'libro', english: 'book', word_type: 'noun', article: 'il', gender: 'm', plural: 'libri' },
      { italian: 'zaino', english: 'backpack', word_type: 'noun', article: 'lo', gender: 'm', plural: 'zaini' },
      { italian: 'matita', english: 'pencil', word_type: 'noun', article: 'la', gender: 'f', plural: 'matite' },
      // Verbs
      {
        italian: 'avere', english: 'to have', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'ho', tu: 'hai', 'lui/lei': 'ha', noi: 'abbiamo', voi: 'avete', loro: 'hanno' } },
      },
      {
        italian: 'essere', english: 'to be', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'sono', tu: 'sei', 'lui/lei': 'è', noi: 'siamo', voi: 'siete', loro: 'sono' } },
      },
      {
        italian: 'andare', english: 'to go', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'vado', tu: 'vai', 'lui/lei': 'va', noi: 'andiamo', voi: 'andate', loro: 'vanno' } },
      },
      // Phrases
      { italian: 'Buongiorno', english: 'Good morning', word_type: 'phrase' },
      { italian: 'Buonasera', english: 'Good evening', word_type: 'phrase' },
      { italian: 'Buonanotte', english: 'Good night', word_type: 'phrase' },
      { italian: 'Ciao', english: 'Hi / Bye (informal)', word_type: 'phrase' },
      { italian: 'Arrivederci', english: 'Goodbye (formal)', word_type: 'phrase' },
      { italian: 'Come stai?', english: 'How are you? (informal)', word_type: 'phrase' },
      { italian: 'Come sta?', english: 'How are you? (formal)', word_type: 'phrase' },
      { italian: 'Sto bene, grazie', english: "I'm fine, thank you", word_type: 'phrase' },
      { italian: 'Prego', english: "You're welcome", word_type: 'phrase' },
      { italian: 'Scusa', english: 'Excuse me (informal)', word_type: 'phrase' },
      { italian: 'Scusi', english: 'Excuse me (formal)', word_type: 'phrase' },
      { italian: 'Per favore', english: 'Please', word_type: 'phrase' },
      { italian: 'Come ti chiami?', english: "What's your name? (informal)", word_type: 'phrase' },
      { italian: 'Mi chiamo...', english: 'My name is...', word_type: 'phrase' },
      { italian: "Dov'è...?", english: 'Where is...?', word_type: 'phrase' },
      { italian: 'Non capisco', english: "I don't understand", word_type: 'phrase' },
    ],
  },
  {
    chapter: 2,
    title: 'Chapter 2 — Come siamo',
    description: 'Adjectives, colors, nationalities; essere; definite articles',
    sort_order: 2,
    cards: [
      // Adjectives — appearance
      { italian: 'alto', english: 'tall', word_type: 'adjective', adjective_forms: { ms: 'alto', fs: 'alta', mp: 'alti', fp: 'alte' } },
      { italian: 'basso', english: 'short', word_type: 'adjective', adjective_forms: { ms: 'basso', fs: 'bassa', mp: 'bassi', fp: 'basse' } },
      { italian: 'bello', english: 'beautiful / handsome', word_type: 'adjective', adjective_forms: { ms: 'bello', fs: 'bella', mp: 'belli', fp: 'belle' } },
      { italian: 'brutto', english: 'ugly', word_type: 'adjective', adjective_forms: { ms: 'brutto', fs: 'brutta', mp: 'brutti', fp: 'brutte' } },
      { italian: 'giovane', english: 'young', word_type: 'adjective', adjective_forms: { ms: 'giovane', fs: 'giovane', mp: 'giovani', fp: 'giovani' } },
      { italian: 'vecchio', english: 'old', word_type: 'adjective', adjective_forms: { ms: 'vecchio', fs: 'vecchia', mp: 'vecchi', fp: 'vecchie' } },
      { italian: 'magro', english: 'thin / slim', word_type: 'adjective', adjective_forms: { ms: 'magro', fs: 'magra', mp: 'magri', fp: 'magre' } },
      { italian: 'grasso', english: 'fat', word_type: 'adjective', adjective_forms: { ms: 'grasso', fs: 'grassa', mp: 'grassi', fp: 'grasse' } },
      // Adjectives — personality
      { italian: 'simpatico', english: 'nice / friendly', word_type: 'adjective', adjective_forms: { ms: 'simpatico', fs: 'simpatica', mp: 'simpatici', fp: 'simpatiche' } },
      { italian: 'antipatico', english: 'unpleasant', word_type: 'adjective', adjective_forms: { ms: 'antipatico', fs: 'antipatica', mp: 'antipatici', fp: 'antipatiche' } },
      { italian: 'intelligente', english: 'intelligent', word_type: 'adjective', adjective_forms: { ms: 'intelligente', fs: 'intelligente', mp: 'intelligenti', fp: 'intelligenti' } },
      { italian: 'stupido', english: 'stupid', word_type: 'adjective', adjective_forms: { ms: 'stupido', fs: 'stupida', mp: 'stupidi', fp: 'stupide' } },
      { italian: 'ricco', english: 'rich', word_type: 'adjective', adjective_forms: { ms: 'ricco', fs: 'ricca', mp: 'ricchi', fp: 'ricche' } },
      { italian: 'povero', english: 'poor', word_type: 'adjective', adjective_forms: { ms: 'povero', fs: 'povera', mp: 'poveri', fp: 'povere' } },
      { italian: 'generoso', english: 'generous', word_type: 'adjective', adjective_forms: { ms: 'generoso', fs: 'generosa', mp: 'generosi', fp: 'generose' } },
      { italian: 'avaro', english: 'stingy / miserly', word_type: 'adjective', adjective_forms: { ms: 'avaro', fs: 'avara', mp: 'avari', fp: 'avare' } },
      { italian: 'tranquillo', english: 'calm / quiet', word_type: 'adjective', adjective_forms: { ms: 'tranquillo', fs: 'tranquilla', mp: 'tranquilli', fp: 'tranquille' } },
      { italian: 'nervoso', english: 'nervous / irritable', word_type: 'adjective', adjective_forms: { ms: 'nervoso', fs: 'nervosa', mp: 'nervosi', fp: 'nervose' } },
      { italian: 'stanco', english: 'tired', word_type: 'adjective', adjective_forms: { ms: 'stanco', fs: 'stanca', mp: 'stanchi', fp: 'stanche' } },
      { italian: 'contento', english: 'happy / pleased', word_type: 'adjective', adjective_forms: { ms: 'contento', fs: 'contenta', mp: 'contenti', fp: 'contente' } },
      { italian: 'triste', english: 'sad', word_type: 'adjective', adjective_forms: { ms: 'triste', fs: 'triste', mp: 'tristi', fp: 'tristi' } },
      // Colors
      { italian: 'rosso', english: 'red', word_type: 'adjective', adjective_forms: { ms: 'rosso', fs: 'rossa', mp: 'rossi', fp: 'rosse' } },
      { italian: 'verde', english: 'green', word_type: 'adjective', adjective_forms: { ms: 'verde', fs: 'verde', mp: 'verdi', fp: 'verdi' } },
      { italian: 'giallo', english: 'yellow', word_type: 'adjective', adjective_forms: { ms: 'giallo', fs: 'gialla', mp: 'gialli', fp: 'gialle' } },
      { italian: 'bianco', english: 'white', word_type: 'adjective', adjective_forms: { ms: 'bianco', fs: 'bianca', mp: 'bianchi', fp: 'bianche' } },
      { italian: 'nero', english: 'black', word_type: 'adjective', adjective_forms: { ms: 'nero', fs: 'nera', mp: 'neri', fp: 'nere' } },
      { italian: 'grigio', english: 'gray', word_type: 'adjective', adjective_forms: { ms: 'grigio', fs: 'grigia', mp: 'grigi', fp: 'grigie' } },
      { italian: 'blu', english: 'blue', word_type: 'adjective', adjective_forms: { ms: 'blu', fs: 'blu', mp: 'blu', fp: 'blu' } },
      { italian: 'arancione', english: 'orange', word_type: 'adjective', adjective_forms: { ms: 'arancione', fs: 'arancione', mp: 'arancioni', fp: 'arancioni' } },
      // Nationalities
      { italian: 'italiano', english: 'Italian', word_type: 'adjective', adjective_forms: { ms: 'italiano', fs: 'italiana', mp: 'italiani', fp: 'italiane' } },
      { italian: 'americano', english: 'American', word_type: 'adjective', adjective_forms: { ms: 'americano', fs: 'americana', mp: 'americani', fp: 'americane' } },
      { italian: 'francese', english: 'French', word_type: 'adjective', adjective_forms: { ms: 'francese', fs: 'francese', mp: 'francesi', fp: 'francesi' } },
      { italian: 'inglese', english: 'English / British', word_type: 'adjective', adjective_forms: { ms: 'inglese', fs: 'inglese', mp: 'inglesi', fp: 'inglesi' } },
      { italian: 'spagnolo', english: 'Spanish', word_type: 'adjective', adjective_forms: { ms: 'spagnolo', fs: 'spagnola', mp: 'spagnoli', fp: 'spagnole' } },
    ],
  },
  {
    chapter: 3,
    title: 'Chapter 3 — Studiare in Italia',
    description: 'Family, university subjects; -are verbs; possessives',
    sort_order: 3,
    cards: [
      // Family nouns
      { italian: 'padre', english: 'father', word_type: 'noun', article: 'il', gender: 'm', plural: 'padri' },
      { italian: 'madre', english: 'mother', word_type: 'noun', article: 'la', gender: 'f', plural: 'madri' },
      { italian: 'fratello', english: 'brother', word_type: 'noun', article: 'il', gender: 'm', plural: 'fratelli' },
      { italian: 'sorella', english: 'sister', word_type: 'noun', article: 'la', gender: 'f', plural: 'sorelle' },
      { italian: 'nonno', english: 'grandfather', word_type: 'noun', article: 'il', gender: 'm', plural: 'nonni' },
      { italian: 'nonna', english: 'grandmother', word_type: 'noun', article: 'la', gender: 'f', plural: 'nonne' },
      { italian: 'marito', english: 'husband', word_type: 'noun', article: 'il', gender: 'm', plural: 'mariti' },
      { italian: 'moglie', english: 'wife', word_type: 'noun', article: 'la', gender: 'f', plural: 'mogli' },
      { italian: 'figlio', english: 'son', word_type: 'noun', article: 'il', gender: 'm', plural: 'figli' },
      { italian: 'figlia', english: 'daughter', word_type: 'noun', article: 'la', gender: 'f', plural: 'figlie' },
      { italian: 'zio', english: 'uncle', word_type: 'noun', article: 'lo', gender: 'm', plural: 'zii' },
      { italian: 'zia', english: 'aunt', word_type: 'noun', article: 'la', gender: 'f', plural: 'zie' },
      { italian: 'cugino', english: 'cousin (m)', word_type: 'noun', article: 'il', gender: 'm', plural: 'cugini' },
      { italian: 'cugina', english: 'cousin (f)', word_type: 'noun', article: 'la', gender: 'f', plural: 'cugine' },
      // University subjects
      { italian: 'matematica', english: 'mathematics', word_type: 'noun', article: 'la', gender: 'f', plural: 'matematiche' },
      { italian: 'storia', english: 'history', word_type: 'noun', article: 'la', gender: 'f', plural: 'storie' },
      { italian: 'biologia', english: 'biology', word_type: 'noun', article: 'la', gender: 'f', plural: 'biologie' },
      { italian: 'economia', english: 'economics', word_type: 'noun', article: "l'", gender: 'f', plural: 'economie' },
      { italian: 'filosofia', english: 'philosophy', word_type: 'noun', article: 'la', gender: 'f', plural: 'filosofie' },
      { italian: 'letteratura', english: 'literature', word_type: 'noun', article: 'la', gender: 'f', plural: 'letterature' },
      // -are verbs
      {
        italian: 'parlare', english: 'to speak / to talk', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'parlo', tu: 'parli', 'lui/lei': 'parla', noi: 'parliamo', voi: 'parlate', loro: 'parlano' } },
      },
      {
        italian: 'studiare', english: 'to study', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'studio', tu: 'studi', 'lui/lei': 'studia', noi: 'studiamo', voi: 'studiate', loro: 'studiano' } },
      },
      {
        italian: 'lavorare', english: 'to work', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'lavoro', tu: 'lavori', 'lui/lei': 'lavora', noi: 'lavoriamo', voi: 'lavorate', loro: 'lavorano' } },
      },
      {
        italian: 'abitare', english: 'to live / to reside', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'abito', tu: 'abiti', 'lui/lei': 'abita', noi: 'abitiamo', voi: 'abitate', loro: 'abitano' } },
      },
      {
        italian: 'mangiare', english: 'to eat', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'mangio', tu: 'mangi', 'lui/lei': 'mangia', noi: 'mangiamo', voi: 'mangiate', loro: 'mangiano' } },
      },
      {
        italian: 'ascoltare', english: 'to listen', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'ascolto', tu: 'ascolti', 'lui/lei': 'ascolta', noi: 'ascoltiamo', voi: 'ascoltate', loro: 'ascoltano' } },
      },
      {
        italian: 'guardare', english: 'to watch / to look at', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'guardo', tu: 'guardi', 'lui/lei': 'guarda', noi: 'guardiamo', voi: 'guardate', loro: 'guardano' } },
      },
      {
        italian: 'chiamare', english: 'to call', word_type: 'verb', tense: 'present',
        conjugations: { present: { io: 'chiamo', tu: 'chiami', 'lui/lei': 'chiama', noi: 'chiamiamo', voi: 'chiamate', loro: 'chiamano' } },
      },
    ],
  },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function seedChapter(chapterData: SeedSet) {
  console.log(`\nSeeding: ${chapterData.title}`)

  const { data: setRow, error: setErr } = await db
    .from('sets')
    .insert({
      title:       chapterData.title,
      description: chapterData.description,
      category:    'general',
      sort_order:  chapterData.sort_order,
    })
    .select('id')
    .single()
  if (setErr) throw setErr

  const setId = setRow.id
  let count = 0

  for (let i = 0; i < chapterData.cards.length; i++) {
    const c = chapterData.cards[i]
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
      sort_order:      i + 1,
      enabled:         true,
    })
    if (error) {
      console.error(`  ✗ ${c.italian}: ${error.message}`)
    } else {
      count++
    }
    await sleep(30)
  }

  console.log(`  ✓ ${count}/${chapterData.cards.length} cards seeded`)
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

  let totalCards = 0
  for (const chapterData of toSeed) {
    totalCards += await seedChapter(chapterData)
  }

  console.log(`\nDone. Seeded ${totalCards} cards across ${toSeed.length} set(s).`)
}

main().catch(err => { console.error(err); process.exit(1) })
