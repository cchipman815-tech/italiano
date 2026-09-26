import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import EditTopic from '@/components/EditTopic'
import { isValidUserId } from '@/lib/users'
import { loadEditTopic } from '@/lib/queries'
import { isChapter } from '@/lib/cards'

export default async function EditTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cap?: string }>
}) {
  const userId = Number((await cookies()).get('userId')?.value)
  if (!isValidUserId(userId)) redirect('/login')

  const [{ id }, { cap }] = await Promise.all([params, searchParams])
  const topic = await loadEditTopic(id)
  if (!topic) notFound()

  const chapter = Number(cap)
  return (
    <EditTopic
      key={topic.id}
      topic={{ id: topic.id, title: topic.title, category: topic.category }}
      initialCards={topic.cards}
      chapter={isChapter(chapter) ? chapter : null}
    />
  )
}
