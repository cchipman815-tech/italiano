'use client'

export default function SignOutButton() {
  function handleSignOut() {
    document.cookie = 'userId=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
    >
      Sign out
    </button>
  )
}
