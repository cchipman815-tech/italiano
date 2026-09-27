import { notFound, redirect } from 'next/navigation'
import { loadSetPath } from '@/lib/queries'

/** A topic has no page of its own: it opens as the topic sheet on its path page. */
export default async function TopicRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const path = await loadSetPath(id)
  if (!path) notFound()
  redirect(`/learn/${path.slug}?topic=${id}`)
}
