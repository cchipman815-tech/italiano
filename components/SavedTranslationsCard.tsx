import Link from 'next/link'

interface Props {
  count: number
}

export default function SavedTranslationsCard({ count }: Props) {
  return (
    <Link
      href="/saved"
      className="bg-white rounded-2xl border-2 border-qz-border p-5 flex items-center hover:border-qz-blue transition-colors min-h-[160px]"
      style={{ boxShadow: 'var(--qz-shadow-card)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-qz-blue-light flex items-center justify-center shrink-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-qz-blue"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-qz-text">Saved Translations</h2>
          <p className="text-sm text-qz-secondary">
            {count === 0 ? 'No saves yet' : `${count} saved`}
          </p>
        </div>
      </div>
    </Link>
  )
}
