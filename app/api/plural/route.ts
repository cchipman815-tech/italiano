import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an Italian grammar expert.
Given an Italian noun (singular form, without article), return its plural form.
Return only the plural form — no article, no explanation.
Example: "libro" → "libri", "uomo" → "uomini", "città" → "città"
Respond with plain text only.`

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
      max_tokens: 20,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Italian noun (singular): "${italian}" (English: "${english}")\nPlural form:`,
      }],
    })

    const plural = message.content[0].type === 'text'
      ? message.content[0].text.trim().toLowerCase()
      : ''

    if (!plural) throw new Error('Empty response from Claude')

    const db = createServerClient()
    const { error } = await db.from('cards').update({ plural }).eq('id', cardId)
    if (error) throw error

    return NextResponse.json({ plural })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
