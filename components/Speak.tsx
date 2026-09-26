'use client'
import { useSyncExternalStore } from 'react'
import { plainText, t } from '@/lib/i18n'
import { useShell } from './Shell'
import { Icon } from './StudyIcons'

/**
 * Pronunciation through /api/tts. One clip plays at a time; while it plays,
 * <html> has the `playing` class, which makes the Ambra glow breathe.
 * Clips are kept for the session, so hearing a word again is instant.
 */

type Status = 'idle' | 'loading' | 'playing'

let current: { text: string | null; status: Status } = { text: null, status: 'idle' }
let audio: HTMLAudioElement | null = null
const clips = new Map<string, string>()
const listeners = new Set<() => void>()

function setCurrent(next: typeof current) {
  current = next
  document.documentElement.classList.toggle('playing', next.status === 'playing')
  listeners.forEach(l => l())
}

export function stopSpeaking() {
  audio?.pause()
  audio = null
  if (current.status !== 'idle') setCurrent({ text: null, status: 'idle' })
}

/** Play `text`; tapping the same text again while it plays stops it. */
export async function speak(text: string) {
  if (current.text === text && current.status !== 'idle') {
    stopSpeaking()
    return
  }
  stopSpeaking()
  setCurrent({ text, status: 'loading' })
  try {
    let src = clips.get(text)
    if (!src) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json() as { audioContent?: string; error?: string }
      if (!res.ok || !data.audioContent) throw new Error(data.error ?? 'No audio')
      src = `data:audio/mp3;base64,${data.audioContent}`
      clips.set(text, src)
    }
    if (current.text !== text) return // something else was tapped meanwhile
    const clip = new Audio(src)
    audio = clip
    const done = () => { if (audio === clip) stopSpeaking() }
    clip.onended = done
    clip.onerror = done
    setCurrent({ text, status: 'playing' })
    await clip.play()
  } catch {
    if (current.text === text) setCurrent({ text: null, status: 'idle' })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Whether `text` is loading or playing right now. */
export function useSpeechStatus(text: string): Status {
  return useSyncExternalStore(
    subscribe,
    () => (current.text === text ? current.status : 'idle'),
    () => 'idle',
  )
}

/** The round 44px speaker button (prototype `.spk2`). */
export function SpeakOrb({ text }: { text: string }) {
  const imm = useShell()?.prefs.imm ?? 'mix'
  const status = useSpeechStatus(text)
  return (
    <button
      type="button"
      className={`spk2${status === 'playing' ? ' on' : ''}`}
      aria-label={`${plainText(t('listen'), imm)}: ${text}`}
      aria-busy={status === 'loading' || undefined}
      onClick={e => { e.stopPropagation(); void speak(text) }}
    >
      <Icon name="speak" size={18} />
    </button>
  )
}
