'use client'

export default function SignOutButton() {
  function handleSignOut() {
    document.cookie = 'userId=; path=/; max-age=0'
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-qz-secondary hover:text-qz-text transition-colors cursor-pointer"
    >
      Sign out
    </button>
  )
}
