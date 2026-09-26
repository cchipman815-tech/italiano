import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserIdFromCookie, unauthorized } from '@/lib/api-helpers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromCookie()
  if (!userId) return unauthorized()

  const { prompt, systemPrompt, maxTokens = 512 } = await req.json() as {
    prompt: string
    systemPrompt?: string
    maxTokens?: number
  }

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Claude API error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
