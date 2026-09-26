import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type FillBlankQuestion = {
  id: string
  type: 'fill_blank'
  italian: string
  english: string
  blankWord: string
  options: string[]
  grammarNote: string
}

export type DialogueQuestion = {
  id: string
  type: 'dialogue'
  lines: Array<{ speaker: string; italian: string; english: string }>
  question: { italian: string; english: string }
  options: string[]
  correct: string
}

export type TranslationQuestion = {
  id: string
  type: 'translation'
  italian: string
  english: string
  options_it: string[]
  correct_it: string
  options_en: string[]
  correct_en: string
  grammarNote: string
}

export type SentencePracticeQuestion = FillBlankQuestion | DialogueQuestion | TranslationQuestion

const SYSTEM_PROMPT = `You are an Italian language teacher creating practice exercises for Prego! chapter 1–3 beginners.
Generate exactly 10 questions mixing three formats: fill_blank (4), dialogue (3), translation (3).
Use ONLY the vocabulary words provided. Keep sentences 5–10 words, present tense only. No subjunctive, conditional, or past tense.

Return ONLY valid JSON with this exact shape (no markdown, no extra text):
{
  "questions": [
    {
      "type": "fill_blank",
      "italian": "Io ___ uno zaino.",
      "english": "I have a backpack.",
      "blank_word": "ho",
      "options": ["ho", "hai", "ha", "abbiamo"],
      "grammar_note": "Avere — io ho"
    },
    {
      "type": "dialogue",
      "lines": [
        { "speaker": "Marco", "italian": "Ciao! Come stai?", "english": "Hi! How are you?" },
        { "speaker": "Sara", "italian": "Sto bene, grazie.", "english": "I'm well, thank you." }
      ],
      "question": { "italian": "Come sta Sara?", "english": "How is Sara?" },
      "options": ["Ha fame.", "Sta bene.", "È stanca."],
      "correct": "Sta bene."
    },
    {
      "type": "translation",
      "italian": "Lei è alta e intelligente.",
      "english": "She is tall and intelligent.",
      "options_it": ["Lei è alto e intelligente.", "Lei è alta e intelligente.", "Lui è alta e intelligente."],
      "correct_it": "Lei è alta e intelligente.",
      "options_en": ["She is tall and intelligent.", "He is tall and intelligent.", "She is short and intelligent."],
      "correct_en": "She is tall and intelligent.",
      "grammar_note": "alta — feminine singular of alto"
    }
  ]
}

Rules:
- fill_blank: use ___ as placeholder; blank a verb form, noun, or adjective — never articles or prepositions; options array has exactly 4 items including the correct answer
- dialogue: 2 speakers, 2–3 lines each; question must be answerable from the dialogue; options array has exactly 3 items
- translation: include one subtle grammar trap in options_it (gender agreement, word order); options_it has exactly 3 Italian variants; options_en has exactly 3 English translations with subtle meaning differences; correct_it and correct_en are the correct answers
- All content must be Prego chapter 1–3 beginner level`

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { setId } = await req.json() as { setId?: string }
  if (!setId) return NextResponse.json({ error: 'setId is required' }, { status: 400 })

  const db = createServerClient()

  // Return cached session if one exists
  const { data: cached } = await db
    .from('sentences')
    .select('id, type, italian, english, metadata')
    .eq('set_id', setId)
    .in('type', ['fill_blank', 'dialogue', 'translation'])
    .order('created_at', { ascending: true })

  if (cached && cached.length >= 10) {
    // Detect stale cached rows that use the old options/correct format
    const translationRows = cached.filter(r => r.type === 'translation')
    const hasOldFormat = translationRows.some(r => {
      const m = r.metadata as Record<string, unknown>
      return m.options !== undefined && m.options_en === undefined
    })
    if (!hasOldFormat) {
      return NextResponse.json({ questions: rowsToQuestions(cached) })
    }
    // Fall through — stale data will be deleted below before regenerating
  }

  // Fetch enabled cards for vocab context
  const { data: cards } = await db
    .from('cards')
    .select('id, italian, english, word_type')
    .eq('set_id', setId)
    .eq('enabled', true)

  if (!cards || cards.length === 0) {
    return NextResponse.json({ error: 'Set not found or has no enabled cards' }, { status: 404 })
  }

  const vocab = cards.map(c => `${c.italian} (${c.english})`).join(', ')

  let rawJson: string
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Vocabulary for this set: ${vocab}\n\nGenerate 10 practice questions using this vocabulary.`,
      }],
    })
    rawJson = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let parsed: { questions: Array<Record<string, unknown>> }
  try {
    // Strip any accidental markdown fences
    const cleaned = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON', raw: rawJson }, { status: 500 })
  }

  // Clear any stale cached sentences for this set before saving new ones
  await db
    .from('sentences')
    .delete()
    .eq('set_id', setId)
    .in('type', ['fill_blank', 'dialogue', 'translation'])

  const cardMap = Object.fromEntries(cards.map(c => [c.italian.toLowerCase(), c.id]))

  const rows = parsed.questions.map(q => {
    if (q.type === 'fill_blank') {
      return {
        set_id:   setId,
        card_id:  cardMap[(q.blank_word as string)?.toLowerCase()] ?? null,
        type:     'fill_blank' as const,
        italian:  q.italian as string,
        english:  q.english as string,
        metadata: { blankWord: q.blank_word, options: q.options, grammarNote: q.grammar_note },
      }
    } else if (q.type === 'dialogue') {
      const question = q.question as { italian: string; english: string }
      return {
        set_id:   setId,
        card_id:  null,
        type:     'dialogue' as const,
        italian:  question.italian,
        english:  question.english,
        metadata: { lines: q.lines, question: q.question, options: q.options, correct: q.correct },
      }
    } else {
      return {
        set_id:   setId,
        card_id:  cardMap[(q.italian as string)?.split(' ')[0]?.toLowerCase()] ?? null,
        type:     'translation' as const,
        italian:  q.italian as string,
        english:  q.english as string,
        metadata: {
          options_it:  q.options_it,
          correct_it:  q.correct_it,
          options_en:  q.options_en,
          correct_en:  q.correct_en,
          grammarNote: q.grammar_note,
        },
      }
    }
  })

  const { data: saved, error: saveErr } = await db
    .from('sentences')
    .insert(rows)
    .select('id, type, italian, english, metadata')

  if (saveErr || !saved) {
    return NextResponse.json({ error: saveErr?.message ?? 'Failed to save sentences' }, { status: 500 })
  }

  return NextResponse.json({ questions: rowsToQuestions(saved) })
}

function rowsToQuestions(
  rows: Array<{ id: string; type: string; italian: string; english: string; metadata: Record<string, unknown> }>
): SentencePracticeQuestion[] {
  return rows.map(row => {
    const m = row.metadata ?? {}
    if (row.type === 'fill_blank') {
      return {
        id:          row.id,
        type:        'fill_blank',
        italian:     row.italian,
        english:     row.english,
        blankWord:   m.blankWord as string,
        options:     m.options as string[],
        grammarNote: m.grammarNote as string,
      } satisfies FillBlankQuestion
    } else if (row.type === 'dialogue') {
      return {
        id:       row.id,
        type:     'dialogue',
        lines:    m.lines as DialogueQuestion['lines'],
        question: m.question as DialogueQuestion['question'],
        options:  m.options as string[],
        correct:  m.correct as string,
      } satisfies DialogueQuestion
    } else {
      return {
        id:          row.id,
        type:        'translation',
        italian:     row.italian,
        english:     row.english,
        options_it:  m.options_it as string[],
        correct_it:  m.correct_it as string,
        options_en:  m.options_en as string[],
        correct_en:  m.correct_en as string,
        grammarNote: m.grammarNote as string,
      } satisfies TranslationQuestion
    }
  }) as SentencePracticeQuestion[]
}
