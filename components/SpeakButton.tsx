'use client'
import { useState } from 'react'

interface Props {
  text: string
  size?: 'sm' | 'md'
}

export default function SpeakButton({ text, size = 'md' }: Props) {
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)

  async function handleSpeak(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (loading || playing) return
    setLoading(true)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`)
      setLoading(false)
      setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.play()
    } catch {
      setLoading(false)
    }
  }

  const isSmall = size === 'sm'

  return (
    <button
      onClick={handleSpeak}
      disabled={loading || playing}
      title={`Hear "${text}"`}
      className={[
        'rounded-full flex items-center justify-center transition-all cursor-pointer',
        'text-qz-secondary hover:text-qz-blue hover:bg-qz-blue-light',
        'disabled:opacity-40 disabled:cursor-default',
        isSmall ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm',
        playing ? 'text-qz-blue bg-qz-blue-light' : '',
      ].filter(Boolean).join(' ')}
    >
      {loading ? '…' : playing ? '♪' : '🔊'}
    </button>
  )
}
