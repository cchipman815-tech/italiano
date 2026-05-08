import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Present-tense conjugations for all 50 Common Verbs (keyed by Italian infinitive)
const CONJUGATIONS: Record<string, { io: string; tu: string; 'lui/lei': string; noi: string; voi: string; loro: string }> = {
  essere:      { io: 'sono',      tu: 'sei',       'lui/lei': 'è',         noi: 'siamo',       voi: 'siete',      loro: 'sono' },
  avere:       { io: 'ho',        tu: 'hai',        'lui/lei': 'ha',        noi: 'abbiamo',     voi: 'avete',      loro: 'hanno' },
  fare:        { io: 'faccio',    tu: 'fai',        'lui/lei': 'fa',        noi: 'facciamo',    voi: 'fate',       loro: 'fanno' },
  andare:      { io: 'vado',      tu: 'vai',        'lui/lei': 'va',        noi: 'andiamo',     voi: 'andate',     loro: 'vanno' },
  venire:      { io: 'vengo',     tu: 'vieni',      'lui/lei': 'viene',     noi: 'veniamo',     voi: 'venite',     loro: 'vengono' },
  parlare:     { io: 'parlo',     tu: 'parli',      'lui/lei': 'parla',     noi: 'parliamo',    voi: 'parlate',    loro: 'parlano' },
  mangiare:    { io: 'mangio',    tu: 'mangi',      'lui/lei': 'mangia',    noi: 'mangiamo',    voi: 'mangiate',   loro: 'mangiano' },
  bere:        { io: 'bevo',      tu: 'bevi',       'lui/lei': 'beve',      noi: 'beviamo',     voi: 'bevete',     loro: 'bevono' },
  dormire:     { io: 'dormo',     tu: 'dormi',      'lui/lei': 'dorme',     noi: 'dormiamo',    voi: 'dormite',    loro: 'dormono' },
  lavorare:    { io: 'lavoro',    tu: 'lavori',     'lui/lei': 'lavora',    noi: 'lavoriamo',   voi: 'lavorate',   loro: 'lavorano' },
  studiare:    { io: 'studio',    tu: 'studi',      'lui/lei': 'studia',    noi: 'studiamo',    voi: 'studiate',   loro: 'studiano' },
  leggere:     { io: 'leggo',     tu: 'leggi',      'lui/lei': 'legge',     noi: 'leggiamo',    voi: 'leggete',    loro: 'leggono' },
  scrivere:    { io: 'scrivo',    tu: 'scrivi',     'lui/lei': 'scrive',    noi: 'scriviamo',   voi: 'scrivete',   loro: 'scrivono' },
  ascoltare:   { io: 'ascolto',   tu: 'ascolti',    'lui/lei': 'ascolta',   noi: 'ascoltiamo',  voi: 'ascoltate',  loro: 'ascoltano' },
  guardare:    { io: 'guardo',    tu: 'guardi',     'lui/lei': 'guarda',    noi: 'guardiamo',   voi: 'guardate',   loro: 'guardano' },
  capire:      { io: 'capisco',   tu: 'capisci',    'lui/lei': 'capisce',   noi: 'capiamo',     voi: 'capite',     loro: 'capiscono' },
  sapere:      { io: 'so',        tu: 'sai',        'lui/lei': 'sa',        noi: 'sappiamo',    voi: 'sapete',     loro: 'sanno' },
  potere:      { io: 'posso',     tu: 'puoi',       'lui/lei': 'può',       noi: 'possiamo',    voi: 'potete',     loro: 'possono' },
  volere:      { io: 'voglio',    tu: 'vuoi',       'lui/lei': 'vuole',     noi: 'vogliamo',    voi: 'volete',     loro: 'vogliono' },
  dovere:      { io: 'devo',      tu: 'devi',       'lui/lei': 'deve',      noi: 'dobbiamo',    voi: 'dovete',     loro: 'devono' },
  stare:       { io: 'sto',       tu: 'stai',       'lui/lei': 'sta',       noi: 'stiamo',      voi: 'state',      loro: 'stanno' },
  prendere:    { io: 'prendo',    tu: 'prendi',     'lui/lei': 'prende',    noi: 'prendiamo',   voi: 'prendete',   loro: 'prendono' },
  dare:        { io: 'do',        tu: 'dai',        'lui/lei': 'dà',        noi: 'diamo',       voi: 'date',       loro: 'danno' },
  vedere:      { io: 'vedo',      tu: 'vedi',       'lui/lei': 'vede',      noi: 'vediamo',     voi: 'vedete',     loro: 'vedono' },
  sentire:     { io: 'sento',     tu: 'senti',      'lui/lei': 'sente',     noi: 'sentiamo',    voi: 'sentite',    loro: 'sentono' },
  aprire:      { io: 'apro',      tu: 'apri',       'lui/lei': 'apre',      noi: 'apriamo',     voi: 'aprite',     loro: 'aprono' },
  chiudere:    { io: 'chiudo',    tu: 'chiudi',     'lui/lei': 'chiude',    noi: 'chiudiamo',   voi: 'chiudete',   loro: 'chiudono' },
  arrivare:    { io: 'arrivo',    tu: 'arrivi',     'lui/lei': 'arriva',    noi: 'arriviamo',   voi: 'arrivate',   loro: 'arrivano' },
  partire:     { io: 'parto',     tu: 'parti',      'lui/lei': 'parte',     noi: 'partiamo',    voi: 'partite',    loro: 'partono' },
  tornare:     { io: 'torno',     tu: 'torni',      'lui/lei': 'torna',     noi: 'torniamo',    voi: 'tornate',    loro: 'tornano' },
  comprare:    { io: 'compro',    tu: 'compri',     'lui/lei': 'compra',    noi: 'compriamo',   voi: 'comprate',   loro: 'comprano' },
  vendere:     { io: 'vendo',     tu: 'vendi',      'lui/lei': 'vende',     noi: 'vendiamo',    voi: 'vendete',    loro: 'vendono' },
  pagare:      { io: 'pago',      tu: 'paghi',      'lui/lei': 'paga',      noi: 'paghiamo',    voi: 'pagate',     loro: 'pagano' },
  trovare:     { io: 'trovo',     tu: 'trovi',      'lui/lei': 'trova',     noi: 'troviamo',    voi: 'trovate',    loro: 'trovano' },
  mettere:     { io: 'metto',     tu: 'metti',      'lui/lei': 'mette',     noi: 'mettiamo',    voi: 'mettete',    loro: 'mettono' },
  portare:     { io: 'porto',     tu: 'porti',      'lui/lei': 'porta',     noi: 'portiamo',    voi: 'portate',    loro: 'portano' },
  usare:       { io: 'uso',       tu: 'usi',        'lui/lei': 'usa',       noi: 'usiamo',      voi: 'usate',      loro: 'usano' },
  camminare:   { io: 'cammino',   tu: 'cammini',    'lui/lei': 'cammina',   noi: 'camminiamo',  voi: 'camminate',  loro: 'camminano' },
  correre:     { io: 'corro',     tu: 'corri',      'lui/lei': 'corre',     noi: 'corriamo',    voi: 'correte',    loro: 'corrono' },
  giocare:     { io: 'gioco',     tu: 'giochi',     'lui/lei': 'gioca',     noi: 'giochiamo',   voi: 'giocate',    loro: 'giocano' },
  cantare:     { io: 'canto',     tu: 'canti',      'lui/lei': 'canta',     noi: 'cantiamo',    voi: 'cantate',    loro: 'cantano' },
  ballare:     { io: 'ballo',     tu: 'balli',      'lui/lei': 'balla',     noi: 'balliamo',    voi: 'ballate',    loro: 'ballano' },
  cucinare:    { io: 'cucino',    tu: 'cucini',     'lui/lei': 'cucina',    noi: 'cuciniamo',   voi: 'cucinate',   loro: 'cucinano' },
  pulire:      { io: 'pulisco',   tu: 'pulisci',    'lui/lei': 'pulisce',   noi: 'puliamo',     voi: 'pulite',     loro: 'puliscono' },
  aiutare:     { io: 'aiuto',     tu: 'aiuti',      'lui/lei': 'aiuta',     noi: 'aiutiamo',    voi: 'aiutate',    loro: 'aiutano' },
  pensare:     { io: 'penso',     tu: 'pensi',      'lui/lei': 'pensa',     noi: 'pensiamo',    voi: 'pensate',    loro: 'pensano' },
  credere:     { io: 'credo',     tu: 'credi',      'lui/lei': 'crede',     noi: 'crediamo',    voi: 'credete',    loro: 'credono' },
  ricordare:   { io: 'ricordo',   tu: 'ricordi',    'lui/lei': 'ricorda',   noi: 'ricordiamo',  voi: 'ricordate',  loro: 'ricordano' },
  dimenticare: { io: 'dimentico', tu: 'dimentichi', 'lui/lei': 'dimentica', noi: 'dimentichiamo', voi: 'dimenticate', loro: 'dimenticano' },
  provare:     { io: 'provo',     tu: 'provi',      'lui/lei': 'prova',     noi: 'proviamo',    voi: 'provate',    loro: 'provano' },
}

async function main() {
  console.log('Seeding conjugations for Common Verbs…')

  // Find the Common Verbs set
  const { data: set, error: setError } = await db
    .from('sets')
    .select('id')
    .eq('title', 'Common Verbs')
    .maybeSingle()

  if (setError || !set) {
    console.error('Could not find "Common Verbs" set:', setError)
    process.exit(1)
  }

  // Fetch all cards in that set
  const { data: cards, error: cardsError } = await db
    .from('cards')
    .select('id, italian')
    .eq('set_id', set.id)

  if (cardsError || !cards) {
    console.error('Could not fetch cards:', cardsError)
    process.exit(1)
  }

  let updated = 0
  let skipped = 0

  for (const card of cards) {
    // The italian column stores the infinitive (e.g. "essere")
    const infinitive = card.italian.trim().toLowerCase()
    const forms = CONJUGATIONS[infinitive]

    if (!forms) {
      console.log(`  ⚠ No conjugations found for "${card.italian}" — skipping`)
      skipped++
      continue
    }

    const { error } = await db
      .from('cards')
      .update({ conjugations: { present: forms } })
      .eq('id', card.id)

    if (error) {
      console.error(`  ✗ Error updating "${card.italian}":`, error.message)
    } else {
      console.log(`  ✓ ${card.italian}: ${forms.io}, ${forms.tu}, ${forms['lui/lei']}, ${forms.noi}, ${forms.voi}, ${forms.loro}`)
      updated++
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
