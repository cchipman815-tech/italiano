import { redirect } from 'next/navigation'

/** Review moved to /review, which also takes ?path= and ?cap=. */
export default async function SetReviewRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/review?set=${id}`)
}
