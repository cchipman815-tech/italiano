'use client'
import { startTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/StudyIcons'
import Bi from '@/components/Bi'

/** Any screen that failed to load: what happened, that nothing was lost, and Riprova. */
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => { console.error(error) }, [error])

  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="st-screen">
      <div className="nm-empty" role="alert">
        <span className="orb bad"><Icon name="alert" size={26} /></span>
        <h2 className="nm-x"><Bi k="cantLoad" /></h2>
        <p className="nm-st"><Bi k="cantLoadHint" /></p>
      </div>
      <div className="nm-float low">
        <button type="button" className="nm-cta on-ac" onClick={retry}>
          <span className="nm-st"><Bi k="tryAgain" /></span>
          <span className="orb"><Icon name="repeat" strokeWidth={2.2} /></span>
        </button>
      </div>
    </div>
  )
}
