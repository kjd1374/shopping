import Link from 'next/link'
import { getBatches } from '../actions/partner'

export const dynamic = 'force-dynamic'

export default async function PartnerPage() {
    const batches = await getBatches() || []

    return (
        <div className="min-h-screen bg-gray-50 p-2">
            <header className="mb-3 pt-2 px-1">
                <h1 className="text-lg font-bold text-gray-900">📦 배송 관리 (Partner)</h1>
                <p className="text-gray-500 text-xs mt-0.5">도착한 화물을 확인하고 발송하세요.</p>
            </header>

            {batches.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-white rounded-lg shadow-sm">
                    표시할 배치가 없습니다.
                </div>
            ) : (
                <div className="space-y-2 pb-20">
                    {batches.map((batch) => (
                        <Link
                            key={batch.id}
                            href={`/partner/batch/${batch.id}`}
                            className="block"
                        >
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 active:bg-gray-50 active:scale-[0.98] transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="text-sm font-bold text-gray-800 leading-tight">
                                        {batch.batch_name || '이름 없는 배치'}
                                    </h2>
                                    <StatusBadge status={batch.status} />
                                </div>

                                <div className="flex flex-col gap-1 text-xs text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] bg-gray-100 px-1 py-0 rounded text-gray-500">Global Tracking</span>
                                        <span className="font-mono font-medium">{batch.tracking_no || '-'}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        생성일: {new Date(batch.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        shipped: "bg-yellow-100 text-yellow-800",
        arrived: "bg-blue-100 text-blue-800",
        completed: "bg-green-100 text-green-800"
    }
    const label = {
        shipped: "배송중",
        arrived: "도착",
        completed: "완료"
    }

    const key = status as keyof typeof styles
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[key] || 'bg-gray-100 text-gray-600'}`}>
            {label[key] || status}
        </span>
    )
}
