import WorkerDetailView from '@/components/workers/WorkerDetailView'

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkerDetailView workerId={id} />
}
