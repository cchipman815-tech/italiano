'use client'
import { USERS } from '@/lib/users'

export default function LoginPage() {
  function selectUser(userId: number) {
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `userId=${userId}; path=/; max-age=${oneYear}; SameSite=Lax`
    window.location.href = '/home'
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">🇮🇹</div>
        <h1 className="text-3xl font-bold text-gray-900">Italiano</h1>
        <p className="text-gray-500 mt-2">Chi sei? / Who are you?</p>
      </div>
      <div className="flex gap-4">
        {USERS.map(user => (
          <button
            key={user.id}
            onClick={() => selectUser(user.id)}
            className="px-8 py-4 text-xl font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
          >
            {user.name}
          </button>
        ))}
      </div>
    </main>
  )
}
