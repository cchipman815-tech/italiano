'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'
import { shuffleArray } from '@/lib/utils'

interface Tile {
  id: string
  cardId: string
  side: 'italian' | 'english'
  text: string
}

function buildRound(cards: Card[]): Tile[] {
  return shuffleArray([
    ...cards.map(c => ({ id: `i-${c.id}`, cardId: c.id, side: 'italian' as const, text: c.italian })),
    ...cards.map(c => ({ id: `e-${c.id}`, cardId: c.id, side: 'english' as const, text: c.english })),
  ])
}

async function saveProgress(cardId: string, known: boolean) {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, known }),
  })
}

interface Props {
  setId: string
  cards: Card[]
}

const ROUND_SIZE = 4

export default function MatchStudy({ setId, cards }: Props) {
  const router = useRouter()
  const enabledCards = cards.filter(c => c.enabled !== false)

  const [rounds] = useState(() => {
    const shuffled = shuffleArray(enabledCards)
    const chunks: Card[][] = []
    for (let i = 0; i < shuffled.length; i += ROUND_SIZE) {
      chunks.push(shuffled.slice(i, i + ROUND_SIZE))
    }
    return chunks
  })

  const [roundIndex, setRoundIndex] = useState(0)
  const [tiles, setTiles] = useState<Tile[]>(() => buildRound(rounds[0]))
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Tile | null>(null)
  const [shaking, setShaking] = useState<Set<string>>(new Set())
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    const timer = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [done])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  function handleTileClick(tile: Tile) {
    if (matched.has(tile.cardId) || shaking.size > 0) return

    if (!selected) {
      setSelected(tile)
      return
    }

    if (selected.id === tile.id) {
      setSelected(null)
      return
    }

    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      const newMatched = new Set(matched)
      newMatched.add(tile.cardId)
      setMatched(newMatched)
      setSelected(null)
      saveProgress(tile.cardId, true)

      if (newMatched.size === rounds[roundIndex].length) {
        setTimeout(() => {
          if (roundIndex + 1 >= rounds.length) {
            setDone(true)
          } else {
            const next = roundIndex + 1
            setRoundIndex(next)
            setTiles(buildRound(rounds[next]))
            setMatched(new Set())
          }
        }, 400)
      }
    } else {
      const ids = new Set([selected.id, tile.id])
      setShaking(ids)
      setSelected(null)
      setTimeout(() => setShaking(new Set()), 500)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🎯</div>
        <h2 className="text-2xl font-bold text-qz-text">All Matched!</h2>
        <p className="text-qz-secondary">Completed in {formatTime(elapsed)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setRoundIndex(0)
              setTiles(buildRound(rounds[0]))
              setMatched(new Set())
              setElapsed(0)
              setDone(false)
            }}
            className="px-6 py-2.5 bg-qz-blue text-white rounded-full font-semibold hover:bg-qz-blue-dark cursor-pointer transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-6 py-2.5 border-2 border-qz-border rounded-full text-qz-secondary font-medium hover:border-qz-blue hover:text-qz-blue cursor-pointer transition-colors"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between text-sm text-qz-secondary">
        <span>Round {roundIndex + 1} of {rounds.length} · {matched.size}/{rounds[roundIndex].length} matched</span>
        <span className="font-mono font-semibold text-qz-text">{formatTime(elapsed)}</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {tiles.map(tile => {
          const isMatched = matched.has(tile.cardId)
          const isSelected = selected?.id === tile.id
          const isShaking = shaking.has(tile.id)
          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={isMatched}
              className={[
                'p-4 rounded-2xl border-2 text-center font-semibold text-qz-text transition-all min-h-[100px] flex items-center justify-center',
                isMatched && 'bg-qz-blue-light border-qz-blue text-qz-blue opacity-50 line-through',
                isSelected && 'bg-qz-blue border-qz-blue text-white scale-95',
                !isMatched && !isSelected && 'bg-white border-qz-border hover:border-qz-blue cursor-pointer',
                isShaking && 'animate-bounce border-red-400',
              ].filter(Boolean).join(' ')}
              style={!isMatched && !isSelected ? { boxShadow: 'var(--qz-shadow-card)' } : undefined}
            >
              {tile.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
