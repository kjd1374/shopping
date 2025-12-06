'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLocalShipping } from '@/app/actions/partner'

type Request = {
    id: string
    recipient_name?: string
    recipient_phone?: string
    shipping_address?: string
    status: string
    local_tracking_no?: string
    request_items: any[]
}

export default function BatchDetailClient({ initialRequests, batchId }: { initialRequests: any[], batchId: string }) {
    const router = useRouter()

    return (
        <div className="p-4 max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-6 pt-4">
                <button onClick={() => router.back()} className="text-2xl p-2">
                    ←
                </button>
                <h1 className="text-xl font-bold">주문 목록 ({initialRequests.length})</h1>
            </div>

            <div className="space-y-8">
                {initialRequests.map((req) => (
                    <RequestCard key={req.id} request={req} batchId={batchId} />
                ))}
            </div>
        </div>
    )
}

function RequestCard({ request, batchId }: { request: Request, batchId: string }) {
    const [trackingNo, setTrackingNo] = useState(request.local_tracking_no || '')
    const [loading, setLoading] = useState(false)
    const isShipped = request.status === 'shipping_local' || request.status === 'completed'

    const copyAddress = async () => {
        const text = `${request.recipient_name || ''}\n${request.recipient_phone || ''}\n${request.shipping_address || ''}`
        try {
            await navigator.clipboard.writeText(text.trim())
            alert('주소가 복사되었습니다!')
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    const handleVerify = async () => {
        if (!trackingNo) return alert('송장 번호를 입력해주세요')

        if (!confirm('발송 완료 처리하시겠습니까?')) return

        setLoading(true)
        try {
            await updateLocalShipping(request.id, batchId, trackingNo)
            // Optimistic update handled by page refresh or revalidatePath
        } catch (e) {
            alert('오류가 발생했습니다.')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isShipped ? 'opacity-80' : 'border-blue-200 ring-1 ring-blue-100'}`}>
            {/* Header */}
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div>
                    <span className="font-bold text-lg text-gray-800">{request.recipient_name || '이름 없음'}</span>
                    {isShipped && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">발송완료</span>}
                </div>
                <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 bg-white border border-gray-300 shadow-sm px-3 py-2 rounded-lg active:bg-gray-100"
                >
                    <span className="text-xl">📋</span>
                    <span className="font-semibold text-sm">주소 복사</span>
                </button>
            </div>

            {/* Address Display (Visual only) */}
            <div className="p-4 text-sm text-gray-600 bg-gray-50/50">
                <div>{request.recipient_phone}</div>
                <div className="break-all mt-1">{request.shipping_address || '주소 정보 없음'}</div>
            </div>

            {/* Items */}
            <div className="p-4 space-y-4">
                {request.request_items?.map((item: any) => (
                    <div key={item.id} className="flex gap-3">
                        {item.og_image && (
                            <img src={item.og_image} alt="" className="w-16 h-16 object-cover rounded bg-gray-100" />
                        )}
                        <div className="flex-1">
                            <div className="font-medium text-gray-900 line-clamp-2 text-sm">{item.og_title || '상품명 없음'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                옵션: {item.user_selected_option || '-'}
                            </div>
                            <div className="text-sm font-bold text-gray-800 mt-1">
                                수량: {item.user_quantity}개
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-gray-50 border-t">
                {isShipped ? (
                    <div className="flex items-center justify-between text-green-700 bg-green-50 p-3 rounded-lg">
                        <span className="font-bold text-sm">✅ 현지 발송 완료</span>
                        <span className="font-mono text-sm">{request.local_tracking_no}</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="현지 택배 송장번호 입력"
                            className="w-full h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg"
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                        />
                        <button
                            onClick={handleVerify}
                            disabled={loading}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-lg flex items-center justify-center gap-2 disabled:bg-gray-400 transform active:scale-[0.98] transition-all"
                        >
                            {loading ? '처리중...' : '송장 입력 및 발송 완료'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
