interface Props {
  gender: 'm' | 'f' | null | undefined
  size?: 'sm' | 'md'
}

export default function GenderBadge({ gender, size = 'md' }: Props) {
  if (!gender) return null

  const label = gender === 'm' ? 'M' : 'F'
  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 font-semibold'
    : 'text-xs px-2 py-0.5 font-bold'
  const colorClasses = gender === 'm'
    ? 'bg-blue-100 text-blue-700 border border-blue-200'
    : 'bg-pink-100 text-pink-700 border border-pink-200'

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses} ${colorClasses}`}>
      {label}
    </span>
  )
}
