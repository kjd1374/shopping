'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getRequestDetails, updateRequestItem, confirmRequest } from '../../../actions/admin'

interface RequestItem {
  id: string
  request_id: string
  original_url: string
  og_image: string | null
  og_title: string
  admin_price: number | null
  admin_capacity: string | null
  admin_color: string | null
  admin_etc: string | null
  admin_rerequest_note: string | null
  user_quantity: number
  created_at: string
}

interface Request {
  id: string
  user_id: string | null
  status: 'pending' | 'reviewed' | 'ordered'
  created_at: string
}

interface ItemUpdate {
  price: string
  capacity: string
  color: string
  etc: string
  rerequestNote: string
  isAvailable: boolean
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest] = useState<Request | null>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [itemUpdates, setItemUpdates] = useState<Record<string, ItemUpdate>>({})

  useEffect(() => {
    if (requestId) {
      fetchDetails()
    }
  }, [requestId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const result = await getRequestDetails(requestId)
      if (result.success && result.request && result.items) {
        setRequest(result.request as Request)
        setItems(result.items as RequestItem[])
        
        // 초기값 설정
        const initialUpdates: Record<string, ItemUpdate> = {}
        result.items.forEach((item: RequestItem) => {
          initialUpdates[item.id] = {
            price: item.admin_price ? item.admin_price.toLocaleString('ko-KR').replace(/,/g, '') : '',
            capacity: item.admin_capacity || '',
            color: item.admin_color || '',
            etc: item.admin_etc || '',
            rerequestNote: item.admin_rerequest_note || '',
            isAvailable: true, // 기본값
          }
        })
        setItemUpdates(initialUpdates)
      } else {
        alert(result.error || '요청 정보를 불러올 수 없습니다.')
        router.push('/admin')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (itemId: string, field: keyof ItemUpdate, value: string | boolean) => {
    setItemUpdates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '')
    if (!numericValue) return ''
    return parseInt(numericValue).toLocaleString('ko-KR')
  }

  const handleSaveAll = async () => {
    if (!request) return

    setSaving(true)
    try {
      // 모든 아이템 업데이트
      const updatePromises = Object.entries(itemUpdates).map(([itemId, data]) => {
        const price = data.price.trim() ? parseFloat(data.price.replace(/,/g, '')) : null
        const capacity = data.capacity.trim() || null
        const color = data.color.trim() || null
        const etc = data.etc.trim() || null
        const rerequestNote = data.rerequestNote.trim() || null
        return updateRequestItem(itemId, price, capacity, color, etc, rerequestNote)
      })

      const results = await Promise.all(updatePromises)
      const hasError = results.some(r => !r.success)

      if (hasError) {
        alert('일부 상품 저장에 실패했습니다.')
        return
      }

      // 요청 상태를 reviewed로 변경
      const confirmResult = await confirmRequest(requestId)
      if (confirmResult.success) {
        alert('견적이 승인되었습니다!')
        router.push('/admin')
      } else {
        alert('상태 변경에 실패했습니다: ' + confirmResult.error)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-sm text-slate-600 hover:text-slate-900 mb-2 flex items-center gap-1"
            >
              ← 목록으로
            </button>
            <h1 className="text-2xl font-black text-slate-900">요청 상세</h1>
            <p className="text-sm text-slate-500 mt-1">
              요청일: {new Date(request.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                request.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : request.status === 'reviewed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {request.status === 'pending' ? '대기중' : request.status === 'reviewed' ? '승인완료' : '주문완료'}
            </span>
          </div>
        </div>

        {/* 아이템 리스트 */}
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* 상단: 고객 요청 정보 (크게 표시) */}
              <div className="bg-gradient-to-r from-slate-50 to-white p-6 border-b border-slate-200">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* 이미지 */}
                  {item.og_image && (
                    <div className="w-full md:w-48 h-48 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 flex-shrink-0">
                      <img
                        src={item.og_image}
                        alt={item.og_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* 상품 정보 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-3 break-words">
                      {item.og_title}
                    </h2>
                    
                    {item.original_url && (
                      <a
                        href={item.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium mb-2 break-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        원본 링크 열기
                      </a>
                    )}
                    
                    <div className="mt-3 text-sm text-slate-600">
                      <span className="font-medium">요청 수량:</span> {item.user_quantity}개
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단: 관리자 입력 폼 */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">
                  관리자 입력
                </h3>

                {/* 그리드 레이아웃 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 판매가 (VND) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      판매가 (VND) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemUpdates[item.id]?.price || ''}
                      onChange={(e) => {
                        const formatted = formatPrice(e.target.value)
                        handleItemChange(item.id, 'price', formatted)
                      }}
                      placeholder="예: 500000"
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    {itemUpdates[item.id]?.price && (
                      <p className="text-sm text-slate-500 mt-2">
                        {parseInt(itemUpdates[item.id].price.replace(/,/g, '') || '0').toLocaleString('vi-VN')} VND
                      </p>
                    )}
                  </div>

                  {/* 용량 옵션 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      용량 옵션
                    </label>
                    <input
                      type="text"
                      value={itemUpdates[item.id]?.capacity || ''}
                      onChange={(e) => handleItemChange(item.id, 'capacity', e.target.value)}
                      placeholder="50ml, 100ml (콤마로 구분)"
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* 색상 옵션 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      색상 옵션
                    </label>
                    <input
                      type="text"
                      value={itemUpdates[item.id]?.color || ''}
                      onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                      placeholder="21호, 23호 (콤마로 구분)"
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* 기타 옵션 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      기타 옵션
                    </label>
                    <input
                      type="text"
                      value={itemUpdates[item.id]?.etc || ''}
                      onChange={(e) => handleItemChange(item.id, 'etc', e.target.value)}
                      placeholder="예: 무향, 유기농"
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* 구매 가능 여부 */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      구매 가능 여부
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'isAvailable', !itemUpdates[item.id]?.isAvailable)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          itemUpdates[item.id]?.isAvailable !== false
                            ? 'bg-indigo-600'
                            : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            itemUpdates[item.id]?.isAvailable !== false
                              ? 'translate-x-7'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-sm text-slate-600 font-medium">
                        {itemUpdates[item.id]?.isAvailable !== false ? '구매 가능' : '구매 불가'}
                      </span>
                    </div>
                  </div>

                  {/* 관리자 메모 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      관리자 메모
                    </label>
                    <textarea
                      value={itemUpdates[item.id]?.rerequestNote || ''}
                      onChange={(e) => handleItemChange(item.id, 'rerequestNote', e.target.value)}
                      placeholder="고객에게 보낼 안내 메시지를 입력하세요"
                      rows={4}
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 액션 바 */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            총 <span className="font-bold text-slate-900">{items.length}</span>개 상품
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => router.push('/admin')}
              className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || request.status !== 'pending'}
              className="flex-1 md:flex-none px-8 py-3 text-base font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {saving ? '저장 중...' : '견적 승인 (Review Complete)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
