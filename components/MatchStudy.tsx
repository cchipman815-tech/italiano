'use client'
import { useState, useEffect, useCallback } from 'react'
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

  const [rounds] = useState(() => {
    const shuffled = shuffleArray(cards)
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
        <h2 className="text-2xl font-bold text-gray-900">All Matched!</h2>
        <p className="text-gray-500">Completed in {formatTime(elapsed)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setRoundIndex(0)
              setTiles(buildRound(rounds[0]))
              setMatched(new Set())
              setElapsed(0)
              setDone(false)
            }}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 cursor-pointer"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push(`/sets/${setId}`)}
            className="px-5 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Back to Set
          </button>
        </div>
      </div>
    )
  }

  const italianTiles = tiles.filter(t => t.side === 'italian')
  const englishTiles = tiles.filter(t => t.side === 'english')

  return (
    <div className="flex flex-col gap-6 py-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Round {roundIndex + 1} of {rounds.length} · {matched.size}/{rounds[roundIndex].length} matched</span>
        <span className="font-mono">{formatTime(elapsed)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Italian</p>
          {italianTiles.map(tile => {
            const isMatched = matched.has(tile.cardId)
            const isSelected = selected?.id === tile.id
            const isShaking = shaking.has(tile.id)
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={isMatched}
                className={[
                  'p-4 rounded-xl border text-center font-medium transition-all',
                  isMatched && 'bg-green-100 border-green-200 text-green-700 opacity-50 line-through',
                  isSelected && 'bg-green-600 border-green-600 text-white',
                  !isMatched && !isSelected && 'bg-white border-gray-200 hover:border-green-400 cursor-pointer',
                  isShaking && 'animate-bounce',
                ].filter(Boolean).join(' ')}
              >
                {tile.text}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">English</p>
          {englishTiles.map(tile => {
            const isMatched = matched.has(tile.cardId)
            const isSelected = selected?.id === tile.id
            const isShaking = shaking.has(tile.id)
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={isMatched}
                className={[
                  'p-4 rounded-xl border text-center font-medium transition-all',
                  isMatched && 'bg-green-100 border-green-200 text-green-700 opacity-50 line-through',
                  isSelected && 'bg-blue-600 border-blue-600 text-white',
                  !isMatched && !isSelected && 'bg-white border-gray-200 hover:border-blue-400 cursor-pointer',
                  isShaking && 'animate-bounce',
                ].filter(Boolean).join(' ')}
              >
                {tile.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
