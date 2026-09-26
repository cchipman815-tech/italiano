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

  // actions
  add:            { it: 'Aggiungi', en: 'Add' },
  save:           { it: 'Salva', en: 'Save' },
  edit:           { it: 'Modifica', en: 'Edit' },
  delete:         { it: 'Elimina', en: 'Delete' },
  cancel:         { it: 'Annulla', en: 'Cancel' },
  undo:           { it: 'Annulla', en: 'Undo' },
  tryAgain:       { it: 'Riprova', en: 'Try again' },

  // states
  nothingDue:     { it: 'Niente da ripassare oggi', en: 'Nothing to review today' },
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
