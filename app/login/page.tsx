'use client'
import { USERS } from '@/lib/users'

function selectUser(userId: number) {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `userId=${userId}; path=/; max-age=${oneYear}; SameSite=Lax`
  window.location.href = '/home'
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-qz-bg">
      <div className="text-center">
        <div className="text-6xl mb-4">🇮🇹</div>
        <h1 className="text-3xl font-bold text-qz-text">Italiano</h1>
        <p className="text-qz-secondary mt-2">Chi sei? / Who are you?</p>
      </div>
      <div className="flex gap-4">
        {USERS.map(user => (
          <button
            key={user.id}
            type="button"
            onClick={() => selectUser(user.id)}
            className="px-8 py-3.5 text-lg font-semibold bg-qz-blue text-white rounded-full hover:bg-qz-blue-dark transition-colors cursor-pointer shadow-[0px_4px_16px_0px_rgba(66,85,255,0.30)]"
          >
            {user.name}
          </button>
        ))}
      </div>
    </main>
  )
}
