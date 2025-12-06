'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLocalShipping } from '@/app/actions/partner'

type RequestItem = {
    id: string
    og_title: string
    og_image: string
    user_quantity: number
    user_selected_option: string
    admin_capacity?: string
    admin_color?: string
    admin_etc?: string
}

type Request = {
    id: string
    recipient_name?: string
    recipient_phone?: string
    recipient_address?: string
    status: string
    local_tracking_no?: string
    request_items: RequestItem[]
}

export default function BatchDetailClient({
    initialRequests,
    batchId,
    batchInfo
}: {
    initialRequests: Request[],
    batchId: string,
    batchInfo: any
}) {
    const router = useRouter()

    // Calculate stats
    const total = initialRequests.length
    const completed = initialRequests.filter(r => r.status === 'shipping_local' || r.status === 'completed').length
    const progress = Math.round((completed / total) * 100) || 0

    return (
        <div className="max-w-lg mx-auto min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-full"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 leading-tight">
                            {batchInfo?.batch_name || '배송 배치'}
                        </h1>
                        <p className="text-xs text-gray-500">
                            {batchInfo?.tracking_no}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>진행률 {progress}%</span>
                    <span>{completed} / {total} 완료</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-6">
                {initialRequests.map((req) => (
                    <RequestCard key={req.id} request={req} batchId={batchId} />
                ))}

                {initialRequests.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        주문이 없습니다.
                    </div>
                )}
            </div>
        </div>
    )
}

function RequestCard({ request, batchId }: { request: Request, batchId: string }) {
    const [trackingNo, setTrackingNo] = useState(request.local_tracking_no || '')
    const [loading, setLoading] = useState(false)
    const [isShipped, setIsShipped] = useState(
        request.status === 'shipping_local' || request.status === 'completed'
    )

    const copyAddress = async () => {
        const text = `${request.recipient_address || ''}`
        if (!text) return alert('주소가 없습니다.')

        try {
            await navigator.clipboard.writeText(text.trim())
            // Show toast or alert
            // For simplicity in this quick implementation, using alert or temporary UI change could be better
            // But let's use a standard alert for now as requested or a better visual cue
            const btn = document.getElementById(`copy-btn-${request.id}`)
            if (btn) {
                const originalText = btn.innerText
                btn.innerText = '✅ 복사됨!'
                btn.className = btn.className.replace('bg-blue-50 text-blue-700', 'bg-green-100 text-green-800')
                setTimeout(() => {
                    btn.innerText = originalText
                    btn.className = btn.className.replace('bg-green-100 text-green-800', 'bg-blue-50 text-blue-700')
                }, 1500)
            }
        } catch (err) {
            console.error('Failed to copy', err)
            alert('복사 실패')
        }
    }

    const handleVerify = async () => {
        if (!trackingNo) return alert('송장 번호를 입력해주세요')

        setLoading(true)
        try {
            await updateLocalShipping(request.id, batchId, trackingNo)
            setIsShipped(true)
        } catch (e) {
            alert('오류가 발생했습니다.')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isShipped ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
            }`}>
            {/* 1. Top: Customer Info */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {request.recipient_name || '이름 없음'}
                        {isShipped && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                발송완료
                            </span>
                        )}
                    </div>
                    <div className="text-gray-500 text-sm mt-0.5 font-mono">
                        {request.recipient_phone || '전화번호 없음'}
                    </div>
                </div>
            </div>

            {/* 2. Middle: Actions */}
            <div className="p-4 bg-gray-50/50">
                <button
                    id={`copy-btn-${request.id}`}
                    onClick={copyAddress}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-bold rounded-xl border border-blue-100 transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    주소 복사
                </button>
                <div className="mt-2 text-xs text-gray-400 px-1 truncate">
                    {request.recipient_address || '주소 정보 없음'}
                </div>
            </div>

            {/* 3. Bottom: Items */}
            <div className="p-4 space-y-3">
                {request.request_items?.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors cursor-pointer" onClick={(e) => {
                        const cb = e.currentTarget.querySelector('input[type="checkbox"]') as HTMLInputElement
                        if (cb && e.target !== cb) cb.checked = !cb.checked
                    }}>
                        <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                                {item.og_title}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                    {item.user_quantity}개
                                </span>
                                {item.user_selected_option && (
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 max-w-full truncate">
                                        {item.user_selected_option}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. Footer: Output */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                {isShipped ? (
                    <div className="flex items-center justify-between bg-white border border-green-200 p-3 rounded-xl shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-xs text-green-600 font-bold">운송장 번호</span>
                            <span className="font-mono text-lg font-bold text-gray-900">{trackingNo}</span>
                        </div>
                        <button
                            onClick={() => setIsShipped(false)}
                            className="text-xs text-gray-400 underline p-1"
                        >
                            수정
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={trackingNo}
                            onChange={(e) => setTrackingNo(e.target.value)}
                            placeholder="운송장 번호"
                            className="flex-1 h-12 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-lg"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={loading || !trackingNo}
                            className="h-12 px-4 bg-gray-900 text-white font-bold rounded-xl shadow-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {loading ? '...' : '발송'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
