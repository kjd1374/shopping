'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getRequestDetails, updateRequestItem, confirmRequest } from '../../../actions/admin'
import { confirmDeposit } from '../../../actions/payment'
import { useLanguage } from '../../../contexts/LanguageContext'

interface RequestItem {
  id: string
  request_id: string
  original_url: string
  og_image: string | null
  og_title: string
  admin_price: number | null
  admin_options: { name: string; price: number }[] | null
  admin_capacity: string | null
  admin_weight: number | null
  admin_color: string | null
  admin_etc: string | null
  admin_rerequest_note: string | null
  user_quantity: number
  created_at: string
  item_status: 'pending' | 'approved' | 'rejected' | 'needs_info'
  user_response: string | null
}

interface Request {
  id: string
  user_id: string | null
  status: 'pending' | 'reviewed' | 'ordered'
  payment_status: 'deposit_pending' | 'deposit_paid' | null
  deposit_amount: number | null
  final_amount: number | null
  shipping_address: any | null
  created_at: string
}

interface ItemUpdate {
  price: string
  options: { name: string; price: string }[]
  capacity: string
  weight: string
  color: string
  etc: string
  rerequestNote: string
  itemStatus: string
}

export default function RequestDetailPage() {
  const { t } = useLanguage()
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
            options: Array.isArray(item.admin_options) ? item.admin_options.map(opt => ({
              name: opt.name,
              price: opt.price.toLocaleString('ko-KR')
            })) : [],
            capacity: item.admin_capacity || '',
            weight: item.admin_weight ? item.admin_weight.toString() : '',
            color: item.admin_color || '',
            etc: item.admin_etc || '',
            rerequestNote: item.admin_rerequest_note || '',
            itemStatus: item.item_status || 'pending',
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

  const handleItemChange = (itemId: string, field: keyof ItemUpdate, value: any) => {
    setItemUpdates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const handleOptionChange = (itemId: string, index: number, field: 'name' | 'price', value: string) => {
    setItemUpdates(prev => {
      const currentOptions = [...(prev[itemId]?.options || [])]
      currentOptions[index] = {
        ...currentOptions[index],
        [field]: field === 'price' ? formatPrice(value) : value
      }
      return {
        ...prev,
        [itemId]: { ...prev[itemId], options: currentOptions }
      }
    })
  }

  const handleAddOption = (itemId: string) => {
    setItemUpdates(prev => {
      const currentOptions = [...(prev[itemId]?.options || [])]
      currentOptions.push({ name: '', price: '' })
      return {
        ...prev,
        [itemId]: { ...prev[itemId], options: currentOptions }
      }
    })
  }

  const handleRemoveOption = (itemId: string, index: number) => {
    setItemUpdates(prev => {
      const currentOptions = prev[itemId]?.options.filter((_, i) => i !== index) || []
      return {
        ...prev,
        [itemId]: { ...prev[itemId], options: currentOptions }
      }
    })
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

        // 옵션 데이터 변환 (빈 값 제외)
        const options = data.options
          .filter(opt => opt.name.trim() && opt.price.trim())
          .map(opt => ({
            name: opt.name.trim(),
            price: parseInt(opt.price.replace(/,/g, ''))
          }))

        const capacity = data.capacity.trim() || null
        const weight = data.weight.trim() ? parseFloat(data.weight) : null
        const color = data.color.trim() || null
        const etc = data.etc.trim() || null
        const rerequestNote = data.rerequestNote.trim() || null

        return updateRequestItem(
          itemId,
          price,
          options.length > 0 ? options : null,
          capacity,
          color,
          etc,
          rerequestNote,
          data.itemStatus,
          weight
        )
      })

      const results = await Promise.all(updatePromises)
      const hasError = results.some(r => !r.success)

      if (hasError) {
        alert('일부 상품 저장에 실패했습니다.')
        return
      }

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

  const handleConfirmDeposit = async () => {
    if (!confirm('입금을 확인하였습니까? 상태를 [입금 완료]로 변경합니다.')) return

    setSaving(true)
    const result = await confirmDeposit(requestId)
    setSaving(false)

    if (result.success) {
      alert('입금 확인 처리가 완료되었습니다.')
      fetchDetails() // 새로고침
    } else {
      alert('처리 실패: ' + result.error)
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
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-sm text-slate-600 hover:text-slate-900 mb-2 flex items-center gap-1"
            >
              {t('admin.back')}
            </button>
            <h1 className="text-2xl font-black text-slate-900">{t('admin.requestDetail')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('admin.requestDate')}: {new Date(request.created_at).toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${request.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : request.status === 'reviewed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
                }`}
            >
              {request.status === 'pending' ? t('admin.status.pending') : request.status === 'reviewed' ? t('admin.status.reviewed') : t('admin.status.ordered')}
            </span>
          </div>
        </div>

        {/* 입금 및 배송 정보 (주문 완료 상태일 때만) */}
        {request.status === 'ordered' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
              📦 {t('admin.paymentInfo')}
              {request.payment_status === 'deposit_paid' && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">{t('admin.depositPaid')}</span>
              )}
              {request.payment_status === 'deposit_pending' && (
                <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">{t('admin.depositPending')}</span>
              )}
            </h2>

            {/* Payment History Display */}
            {request.shipping_address?.paymentHistory && request.shipping_address.paymentHistory.length > 0 && (
              <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Previous Payments</h3>
                <div className="space-y-2">
                  {request.shipping_address.paymentHistory.map((hist: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                      <span className="text-slate-500 text-xs">{new Date(hist.date).toLocaleDateString()}</span>
                      <span className="font-bold text-slate-700">
                        {hist.amount?.toLocaleString()} VND <span className="text-green-600 text-xs">(Paid)</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 mt-2">
                    <span className="text-slate-900 font-bold">Total Previous Paid</span>
                    {/* Tip: The last entry in history represents the cumulative paid amount at that time */}
                    <span className="font-bold text-green-600">
                      {request.shipping_address.paymentHistory[request.shipping_address.paymentHistory.length - 1].amount.toLocaleString()} VND
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 결제 정보 */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">결제 내역</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{t('admin.depositAmount')}</span>
                      <span className="font-bold text-indigo-600">
                        {request.deposit_amount ? request.deposit_amount.toLocaleString() : 0} VND
                        <span className="text-xs text-slate-400 font-normal ml-1">(70%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">{t('admin.totalAmount')}</span>
                      <span className="font-medium text-slate-900">{request.final_amount?.toLocaleString()} VND</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-slate-600 font-bold">{t('admin.depositStatus')}</span>
                      {request.payment_status === 'deposit_pending' ? (
                        <button
                          onClick={handleConfirmDeposit}
                          disabled={saving}
                          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          {t('admin.depositConfirm')}
                        </button>
                      ) : (
                        <span className="text-green-600 font-bold">{t('admin.confirmed')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 배송지 정보 */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">{t('admin.shippingInfo')}</h3>
                {request.shipping_address ? (
                  <div className="space-y-1 text-sm text-slate-700">
                    <p><span className="font-bold text-slate-900">{request.shipping_address.name}</span> ({request.shipping_address.phone})</p>
                    <p>{request.shipping_address.address} {request.shipping_address.detailAddress}</p>
                    <p className="text-slate-500">{request.shipping_address.zipcode}</p>
                  </div>
                ) : (
                  <p className="text-red-500 text-sm">배송지 정보가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        )}

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
                      <span className="font-medium">{t('admin.requestQuantity')}:</span> {item.user_quantity}개
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단: 관리자 입력 폼 */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
                  {t('admin.adminInput')}
                </h3>

                {/* 그리드 레이아웃 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 옵션 및 가격 설정 (New) */}
                  <div className="md:col-span-2 space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      옵션별 가격 설정 (권장)
                    </label>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                      {itemUpdates[item.id]?.options.map((option, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="옵션명 (예: 100ml)"
                            value={option.name}
                            onChange={(e) => handleOptionChange(item.id, idx, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:border-indigo-500 text-slate-900 placeholder:text-slate-500"
                          />
                          <input
                            type="text"
                            placeholder="가격"
                            value={option.price}
                            onChange={(e) => handleOptionChange(item.id, idx, 'price', e.target.value)}
                            className="w-32 px-3 py-2 text-sm border rounded focus:outline-none focus:border-indigo-500 text-right text-slate-900 placeholder:text-slate-500"
                          />
                          <span className="text-xs text-slate-500">VND</span>
                          <button
                            onClick={() => handleRemoveOption(item.id, idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            ✖
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddOption(item.id)}
                        className="w-full py-2 text-sm font-bold text-indigo-600 border border-dashed border-indigo-300 rounded hover:bg-indigo-50"
                      >
                        + 옵션 추가
                      </button>
                    </div>
                  </div>

                  {/* 무게 입력 (New) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      상품 무게 (배송비 계산용)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={itemUpdates[item.id]?.weight || ''}
                        onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                        placeholder="예: 0.5"
                        className="w-full md:w-1/3 px-4 py-3 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-right text-slate-900 placeholder:text-slate-500"
                      />
                      <span className="text-slate-600 font-bold">kg</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('admin.weightDesc')}
                    </p>
                  </div>

                  {/* 기본 판매가 (Legacy/Fallback) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      기본 단가 (옵션 없을 시 적용)
                    </label>
                    <input
                      type="text"
                      value={itemUpdates[item.id]?.price || ''}
                      onChange={(e) => {
                        const formatted = formatPrice(e.target.value)
                        handleItemChange(item.id, 'price', formatted)
                      }}
                      placeholder="예: 500000"
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-500"
                    />
                  </div>

                  {/* 레거시 문자열 옵션 (필요시 사용) */}
                  <div className="md:col-span-2">
                    <p className="text-xs font-bold text-slate-500 mb-2 cursor-pointer hover:text-slate-700" onClick={(e) => {
                      const target = e.currentTarget.nextElementSibling;
                      if (target) target.classList.toggle('hidden');
                    }}>
                      ▼ {t('admin.legacyOption')}
                    </p>
                    <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('admin.capacity')}</label>
                        <input
                          type="text"
                          value={itemUpdates[item.id]?.capacity || ''}
                          onChange={(e) => handleItemChange(item.id, 'capacity', e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('admin.color')}</label>
                        <input
                          type="text"
                          value={itemUpdates[item.id]?.color || ''}
                          onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t('admin.etc')}</label>
                        <input
                          type="text"
                          value={itemUpdates[item.id]?.etc || ''}
                          onChange={(e) => handleItemChange(item.id, 'etc', e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2">
                    <h4 className="text-sm font-bold text-yellow-800 mb-1">{t('admin.userResponse')}</h4>
                    <p className="text-sm text-yellow-900">{item.user_response}</p>
                  </div>

                  {/* 구매 가능 여부 (상태 변경) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {t('admin.statusSetting')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 승인 (Approved) */}
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'itemStatus', 'approved')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${itemUpdates[item.id]?.itemStatus === 'approved'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                          }`}
                      >
                        <span className="font-bold">{t('admin.approve')}</span>
                      </button>

                      {/* 정보요청 (Needs Info) */}
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'itemStatus', 'needs_info')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${itemUpdates[item.id]?.itemStatus === 'needs_info'
                          ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-yellow-400'
                          }`}
                      >
                        <span className="font-bold">{t('admin.needsInfo')}</span>
                      </button>

                      {/* 불가 (Rejected) */}
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'itemStatus', 'rejected')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${itemUpdates[item.id]?.itemStatus === 'rejected'
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-red-400'
                          }`}
                      >
                        <span className="font-bold">{t('admin.reject')}</span>
                      </button>
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
                      className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-slate-900 placeholder:text-slate-500"
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
            {t('admin.totalProducts')} <span className="font-bold text-slate-900">{items.length}</span>개
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => router.push('/admin')}
              className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {t('admin.cancel')}
            </button>
            <button
              onClick={async () => {
                if (!request) return
                setSaving(true)
                try {
                  const updatePromises = Object.entries(itemUpdates).map(([itemId, data]) => {
                    const price = data.price.trim() ? parseFloat(data.price.replace(/,/g, '')) : null

                    const options = data.options
                      .filter(opt => opt.name.trim() && opt.price.trim())
                      .map(opt => ({
                        name: opt.name.trim(),
                        price: parseInt(opt.price.replace(/,/g, ''))
                      }))

                    const capacity = data.capacity.trim() || null
                    const weight = data.weight.trim() ? parseFloat(data.weight) : null
                    const color = data.color.trim() || null
                    const etc = data.etc.trim() || null
                    const rerequestNote = data.rerequestNote.trim() || null

                    return updateRequestItem(
                      itemId,
                      price,
                      options.length > 0 ? options : null,
                      capacity,
                      color,
                      etc,
                      rerequestNote,
                      data.itemStatus,
                      weight
                    )
                  })

                  const results = await Promise.all(updatePromises)
                  if (results.some(r => !r.success)) {
                    alert('일부 상품 저장에 실패했습니다.')
                  } else {
                    alert('임시 저장되었습니다.')
                    fetchDetails() // Refresh data
                  }
                } catch (error) {
                  console.error('Save error:', error)
                  alert('저장 중 오류가 발생했습니다.')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="flex-1 md:flex-none px-6 py-3 text-base font-bold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('admin.tempSave')}
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex-1 md:flex-none px-8 py-3 text-base font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {saving ? t('admin.saving') : t('admin.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
