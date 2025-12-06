import { getBatchDetails, getBatchInfo } from '@/app/actions/partner'
import BatchDetailClient from './BatchDetailClient'

export const dynamic = 'force-dynamic'

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
    const [requests, batchInfo] = await Promise.all([
        getBatchDetails(params.id),
        getBatchInfo(params.id)
    ])

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <BatchDetailClient
                initialRequests={requests || []}
                batchId={params.id}
                batchInfo={batchInfo}
            />
        </div>
    )
}
