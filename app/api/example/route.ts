import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an Italian language tutor helping beginners study.
Generate one short, natural example sentence (5–10 words) using the given Italian word.
Use only present-tense vocabulary appropriate for Prego! Italian chapter 1–3 level.
No subjunctive, conditional, or complex tenses.
Respond with JSON only: {"italian":"<sentence>","english":"<translation>"}
No markdown, no explanation, no extra keys.`

export async function POST(req: NextRequest) {
  const userId = getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { cardId, italian, english } = await req.json() as {
    cardId: string
    italian: string
    english: string
  }

  if (!cardId || !italian || !english) {
    return NextResponse.json({ error: 'cardId, italian, and english are required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Italian word: "${italian}" (English: "${english}")\nGenerate an example sentence using this word.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const example = JSON.parse(raw) as { italian: string; english: string }

    const db = createServerClient()
    const { error } = await db.from('cards').update({ example }).eq('id', cardId)
    if (error) throw error

    return NextResponse.json({ example })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
