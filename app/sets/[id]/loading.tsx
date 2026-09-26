import { ListSkeleton } from '@/components/Skeleton'

/** Study screens and Modifica argomento are subpages: a back button, then rows. */
export default function Loading() {
  return <ListSkeleton back rows={6} />
}
