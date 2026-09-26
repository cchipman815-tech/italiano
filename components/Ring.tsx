const CIRCUMFERENCE = 75.4 // 2π × 12

/** Progress ring: how much of a path or topic is known (0–1). */
export default function Ring({ value }: { value: number }) {
  const fill = Math.max(0, Math.min(1, value)) * CIRCUMFERENCE
  return (
    <svg className="nm-ring" viewBox="0 0 30 30" aria-hidden="true">
      <circle className="bg" cx="15" cy="15" r="12" />
      <circle className="fg" cx="15" cy="15" r="12" strokeDasharray={`${fill.toFixed(1)} ${CIRCUMFERENCE}`} />
    </svg>
  )
}
