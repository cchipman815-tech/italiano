import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TTS API not configured' }, { status: 500 })
  }

  const { text } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  const res = await fetch(`${TTS_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: text.trim() },
      voice: { languageCode: 'it-IT', name: 'it-IT-Neural2-A' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'TTS failed' }, { status: 500 })
  }

  // Return the base64 MP3 directly — client decodes and plays it
  return NextResponse.json({ audioContent: data.audioContent })
}
