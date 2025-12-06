'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getShipmentBatches } from '../../actions/admin'

interface ShipmentBatch {
    id: string
    batch_name: string
    tracking_no: string
    status: 'shipped' | 'arrived' | 'completed'
    created_at: string
}

export default function AdminBatchesPage() {
    const [batches, setBatches] = useState<ShipmentBatch[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchBatches = async () => {
        setLoading(true)
        try {
            const result = await getShipmentBatches()
            if (result.success && result.data) {
                setBatches(result.data as ShipmentBatch[])
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBatches()
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push('/admin')}
                            className="text-sm text-slate-600 hover:text-slate-900 mb-2 flex items-center gap-1"
                        >
                            ← 요청 목록으로
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">배송 배치 관리</h1>
                        <p className="text-sm text-slate-500">파트너에게 전달된 배송 목록</p>
                    </div>
                </div>

                {/* 배치 리스트 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        배치명
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        송장번호 (International)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        상태
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        생성일
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {batches.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            생성된 배송 배치가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    batches.map((batch) => (
                                        <tr key={batch.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {batch.batch_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                                                {batch.tracking_no}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${batch.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(batch.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
