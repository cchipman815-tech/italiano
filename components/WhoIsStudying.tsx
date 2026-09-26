'use client'
import { useState } from 'react'
import Bi from './Bi'

const ONE_YEAR = 60 * 60 * 24 * 365

function signIn(id: number) {
  document.cookie = `userId=${id}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
  window.location.href = '/home'
}

/**
 * Two large avatar buttons. Choosing one sets the `userId` cookie and loads
 * Oggi; where the browser has cross-document view transitions, the page
 * cross-fades into it slowly (app/shell.css).
 */
export default function WhoIsStudying({ people }: { people: { id: number; name: string; due: number | null }[] }) {
  const [chosen, setChosen] = useState<number | null>(null)

  function choose(id: number) {
    if (chosen != null) return
    setChosen(id)
    signIn(id)
  }

  return (
    <main className="lg">
      <span className="nm-eb">Italiano</span>
      <h1 className="ser" lang="it">Chi studia?</h1>
      <small className="nm-x"><Bi k="whoIsStudying" /></small>
      <div className="lg-pick">
        {people.map(p => (
          <button
            key={p.id}
            type="button"
            className="lg-u"
            aria-busy={chosen === p.id || undefined}
            onClick={() => choose(p.id)}
          >
            <span className="av" aria-hidden="true">{p.name[0]}</span>
            <b>{p.name}</b>
            {p.due != null && (
              <small className={`tab-n nm-x${p.due === 0 ? ' none' : ''}`}>
                {p.due} <Bi k="due" />
              </small>
            )}
          </button>
        ))}
      </div>
      <p className="lg-note nm-st"><Bi k="loginNote" /></p>
    </main>
  )
}
