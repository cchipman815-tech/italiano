/**
 * Bilingual labels. Every interface string is an Italian/English pair; the
 * `imm` preference (lib/prefs.ts) decides how a pair shows:
 *
 *   it   Italian only
 *   mix  Italian, with the English smaller beside or below it (default)
 *   en   English only
 *
 * In the DOM, <Bi> renders both halves and CSS on <html data-imm> picks,
 * so switching levels needs no re-render. `label()` and `plainText()` are for
 * places CSS can't reach, like aria-label and document titles.
 * Strings are copied from docs/design/notte-prototype.html.
 */
import type { Bilingual } from './paths'
import type { Immersion } from './prefs'

export const STRINGS = {
  // tabs and shell
  today:          { it: 'Oggi', en: 'Today' },
  learn:          { it: 'Impara', en: 'Learn' },
  translate:      { it: 'Traduci', en: 'Translate' },
  saved:          { it: 'Salvate', en: 'Saved' },
  yourPaths:      { it: 'I tuoi percorsi', en: 'Your paths' },
  path:           { it: 'Percorso', en: 'Path' },

  // profile sheet
  appearance:     { it: 'Aspetto', en: 'Appearance' },
  howMuchItalian: { it: 'Quanto italiano?', en: 'How much Italian?' },
  desktopVersion: { it: 'Versione desktop', en: 'Desktop version' },
  switchUser:     { it: 'Cambia utente', en: 'Switch user' },
  switch:         { it: 'Cambia', en: 'Switch' },
  signOut:        { it: 'Esci', en: 'Sign out' },
  whoIsStudying:  { it: 'Scegli il tuo nome', en: "Who's studying?" },
  studyingNow:    { it: 'Sta studiando', en: 'Studying now' },
  profile:        { it: 'Profilo', en: 'Profile' },
  installApp:     { it: "Installa l'app", en: 'Install the app' },
  tabs:           { it: 'Schede', en: 'Tabs' },
  dismiss:        { it: 'Chiudi', en: 'Dismiss' },
  back:           { it: 'Indietro', en: 'Back' },

  // study
  review:         { it: 'Ripassa', en: 'Review' },
  reviewAll:      { it: 'Ripassa tutto', en: 'Review everything' },
  reviewAgain:    { it: 'Ripassa di nuovo', en: 'Review again' },
  continue:       { it: 'Continua', en: 'Continue' },
  start:          { it: 'Inizia', en: 'Start' },
  next:           { it: 'Avanti', en: 'Next' },
  knowIt:         { it: 'Lo so', en: 'Know it' },
  stillLearning:  { it: 'Ancora', en: 'Still learning' },
  tapToFlip:      { it: 'Tocca per girare', en: 'Tap to flip' },
  listen:         { it: 'Ascolta', en: 'Listen' },
  due:            { it: 'da ripassare', en: 'to review' },
  new:            { it: 'nuove', en: 'new' },
  backToToday:    { it: 'Torna a Oggi', en: 'Back to Today' },
  learnNew:       { it: 'Impara qualcosa di nuovo', en: 'Learn something new' },
  all:            { it: 'Tutti', en: 'All' },
  chapterFilter:  { it: 'Capitolo di Prego', en: 'Prego chapter' },
  direction:      { it: 'Direzione', en: 'Direction' },
  newTopic:       { it: 'Nuovo argomento', en: 'New topic' },
  editTopic:      { it: 'Modifica argomento', en: 'Edit topic' },
  editTopicHint:  { it: 'Carte, attive, esempi', en: 'Cards, on/off, examples' },

  // actions
  add:            { it: 'Aggiungi', en: 'Add' },
  save:           { it: 'Salva', en: 'Save' },
  edit:           { it: 'Modifica', en: 'Edit' },
  delete:         { it: 'Elimina', en: 'Delete' },
  cancel:         { it: 'Annulla', en: 'Cancel' },
  undo:           { it: 'Annulla', en: 'Undo' },
  tryAgain:       { it: 'Riprova', en: 'Try again' },

  // Traduci
  translateHint:  { it: 'Ogni traduzione si salva da sola in Salvate', en: 'Every translation saves itself to Saved' },
  translating:    { it: 'Traduco…', en: 'Translating…' },
  textToTranslate:{ it: 'Testo da tradurre', en: 'Text to translate' },
  typeEnglish:    { it: 'Scrivi in inglese…', en: 'Type in English…' },
  typeItalian:    { it: 'Scrivi in italiano…', en: 'Type in Italian…' },
  typeSomething:  { it: 'Scrivi una parola o una frase.', en: 'Type a word or a sentence.' },
  clear:          { it: 'Cancella', en: 'Clear' },
  savedToSaved:   { it: 'Salvata in Salvate', en: 'Saved to Saved' },
  notSaved:       { it: 'Non salvata', en: 'Not saved' },
  cantTranslate:  { it: 'Impossibile tradurre', en: 'Unable to translate' },
  somethingWrong: { it: 'Qualcosa non ha funzionato. Riprova tra poco.', en: 'Something went wrong. Try again in a moment.' },
  feminine:       { it: 'femminile', en: 'feminine' },
  masculine:      { it: 'maschile', en: 'masculine' },

  // Salvate
  search:         { it: 'Cerca', en: 'Search' },
  searchSaved:    { it: 'Cerca nelle salvate', en: 'Search saved translations' },
  clearSearch:    { it: 'Cancella ricerca', en: 'Clear search' },
  noSaved:        { it: 'Nessuna traduzione salvata', en: 'No saved translations' },
  noSavedHint:    { it: 'Quello che traduci si salva qui da solo, pronto da riascoltare.', en: 'Whatever you translate is saved here on its own, ready to hear again.' },
  openTranslate:  { it: 'Apri Traduci', en: 'Open Translate' },
  actions:        { it: 'Azioni', en: 'Actions' },
  addToTopic:     { it: 'Aggiungi a un argomento', en: 'Add to a topic' },
  addToTopicHint: { it: 'Diventa una carta da studiare', en: 'It becomes a card to study' },
  chooseTopic:    { it: "Scegli l'argomento", en: 'Choose the topic' },
  otherTopics:    { it: 'Altro', en: 'Other' },
  noTopics:       { it: 'Ancora nessun argomento', en: 'No topics yet' },
  deletedPrefix:  { it: 'Eliminata: ', en: 'Deleted: ' },
  addedTo:        { it: 'Aggiunta a ', en: 'Added to ' },
  alreadyIn:      { it: 'È già in ', en: 'Already in ' },
  cantDelete:     { it: 'Impossibile eliminare', en: 'Unable to delete' },
  cantRestore:    { it: 'Impossibile ripristinare', en: 'Unable to restore' },
  cantAdd:        { it: 'Impossibile aggiungere', en: 'Unable to add' },

  // Modifica argomento
  addCard:        { it: 'Aggiungi carta', en: 'Add card' },
  addCardHint:    { it: "Scrivi in inglese: l'italiano arriva da solo", en: 'Type in English: the Italian fills itself in' },
  noCards:        { it: 'Nessuna carta ancora', en: 'No cards yet' },
  noCardsHint:    { it: "Aggiungi la prima qui sotto: scrivi in inglese e l'italiano arriva da solo.", en: 'Add the first one below: type it in English and the Italian fills itself in.' },
  deleteTopic:    { it: 'Elimina argomento', en: 'Delete topic' },
  deleteCardQ:    { it: 'Eliminare la carta?', en: 'Delete this card?' },
  deleteCard:     { it: 'Elimina carta', en: 'Delete card' },
  cardDeleted:    { it: 'Carta eliminata: ', en: 'Card deleted: ' },
  topicDeleted:   { it: 'Argomento eliminato: ', en: 'Topic deleted: ' },
  turnAllOn:      { it: 'Attiva tutte', en: 'Turn all on' },
  addPlural:      { it: '+ plurale', en: '+ plural' },
  addExample:     { it: '+ esempio', en: '+ example' },
  generating:     { it: 'Genero…', en: 'Generating…' },
  conjugate:      { it: 'Coniuga', en: 'Conjugate' },
  conjugating:    { it: 'Coniugo…', en: 'Conjugating…' },
  italian:        { it: 'Italiano', en: 'Italian' },
  english:        { it: 'Inglese', en: 'English' },
  article:        { it: 'Articolo', en: 'Article' },
  chapter:        { it: 'Capitolo', en: 'Chapter' },
  wordType:       { it: 'Tipo', en: 'Type' },
  inReview:       { it: 'In ripasso', en: 'In review' },
  formOn:         { it: 'Attiva', en: 'On' },
  details:        { it: 'Dettagli', en: 'Details' },
  cantSave:       { it: 'Impossibile salvare. Riprova.', en: 'Unable to save. Try again.' },
  cantGenerate:   { it: 'Impossibile generare. Riprova.', en: 'Unable to generate. Try again.' },
  cantConjugate:  { it: 'Impossibile coniugare. Riprova.', en: 'Unable to conjugate. Try again.' },

  // Aggiungi carta
  try:            { it: 'Prova', en: 'Try' },
  looksLikeVerb:  { it: 'Sembra un verbo. Aggiungo anche le 6 forme del presente? Restano spente finché non le attivi.', en: 'Looks like a verb. Add the 6 present-tense forms too? They stay off until you turn them on.' },
  addForms:       { it: 'Aggiungi coniugazioni', en: 'Add conjugations' },
  typeWordEn:     { it: 'Scrivi la parola in inglese.', en: 'Type the word in English.' },
  typeWordIt:     { it: 'Scrivi la parola in italiano, o tocca Traduci.', en: 'Type the Italian word, or tap Translate.' },
  typeItYourself: { it: "Impossibile tradurre. Scrivi tu l'italiano.", en: 'Unable to translate. Type the Italian yourself.' },
  cantAddCard:    { it: 'Impossibile aggiungere la carta. Riprova.', en: 'Unable to add the card. Try again.' },

  // Nuovo argomento
  newTopicHint:   { it: 'Un piccolo mazzo dentro un percorso', en: 'A small deck inside a path' },
  name:           { it: 'Nome', en: 'Name' },
  nameMissing:    { it: "Dai un nome all'argomento.", en: 'Give the topic a name.' },
  chapterOptional:{ it: 'Capitolo di Prego (facoltativo)', en: 'Prego chapter (optional)' },
  none:           { it: 'Nessuno', en: 'None' },
  createTopic:    { it: 'Crea argomento', en: 'Create topic' },
  cantCreate:     { it: "Impossibile creare l'argomento. Riprova.", en: 'Unable to create the topic. Try again.' },

  // Chi studia?
  loginNote:      { it: 'Nessuna password: il telefono è vostro. Puoi cambiare dal profilo.', en: "No password: it's your own phone. Switch anytime from your profile." },

  // states
  nothingDue:    { it: 'Niente da ripassare oggi', en: 'Nothing to review today' },
  cantLoad:       { it: 'Impossibile caricare le carte', en: 'Unable to load your cards' },
  cantLoadHint:   { it: 'Controlla la connessione e riprova. Le risposte di oggi sono salvate.', en: "Check your connection and try again. Today's answers are saved." },
  notFound:       { it: 'Questa pagina non esiste', en: "This page doesn't exist" },
  notFoundHint:   { it: 'Forse il link è vecchio. Le tue carte sono al sicuro.', en: 'The link may be old. Your cards are safe.' },
  loading:        { it: 'Carico…', en: 'Loading…' },
  offline:        { it: 'Senza rete', en: 'Offline' },
  checkConnection:{ it: 'Controlla la connessione e riprova.', en: 'Check your connection and try again.' },
} as const satisfies Record<string, Bilingual>

export type StringKey = keyof typeof STRINGS

export function t(key: StringKey): Bilingual {
  return STRINGS[key]
}

export interface Label {
  /** The main line. */
  text: string
  /** Its language, for the `lang` attribute. */
  lang: 'it' | 'en'
  /** The smaller English line in Mix; null otherwise. */
  sub: string | null
}

/** How a pair reads at an immersion level. */
export function label(pair: Bilingual, imm: Immersion): Label {
  if (imm === 'en') return { text: pair.en, lang: 'en', sub: null }
  const sub = imm === 'mix' && pair.en !== pair.it ? pair.en : null
  return { text: pair.it, lang: 'it', sub }
}

/** A pair flattened to one string, e.g. for aria-label: "Oggi · Today" in Mix. */
export function plainText(pair: Bilingual, imm: Immersion): string {
  const { text, sub } = label(pair, imm)
  return sub ? `${text} · ${sub}` : text
}
