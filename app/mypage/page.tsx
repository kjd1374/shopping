'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { signOut } from '../actions/auth'
import { confirmOrder } from '../actions/order'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLanguage } from '../contexts/LanguageContext'

// Simplified Interface
interface RequestItem {
  id: string
  og_title: string
  og_image: string | null
  admin_price: number | null
  admin_options: { name: string; price: number }[] | null
  admin_capacity: string | null
  admin_weight: number | null // Added weight
  admin_color: string | null
  admin_etc: string | null
  admin_rerequest_note: string | null
  user_selected_options: Record<string, string> | null
  user_quantity: number
  item_status: 'pending' | 'approved' | 'rejected' | 'needs_info'
  user_response: string | null
  is_buyable?: boolean
  is_hidden_by_user?: boolean
}

interface Request {
  id: string
  status: string
  payment_status?: 'unpaid' | 'deposit_pending' | 'deposit_paid' | 'final_pending' | 'paid'
  deposit_amount?: number
  final_amount?: number
  created_at: string
  request_items: RequestItem[]
}

export default function MyPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [itemSelections, setItemSelections] = useState<Record<string, {
    quantity: number
    selectedOptionIndex?: number
  }>>({})
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({})
  const [selectedDeleteItems, setSelectedDeleteItems] = useState<Set<string>>(new Set())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      router.push('/login')
      return
    }

    setUser(currentUser)

    const { data, error } = await supabase
      .from('requests')
      .select(`
        id,
        status,
        payment_status,
        deposit_amount,
        final_amount,
        created_at,
        request_items (
          id,
          og_title,
          og_image,
          admin_price,
          admin_options,
          admin_capacity,
          admin_weight,
          admin_color,
          admin_etc,
          admin_rerequest_note,
          user_selected_options,
          user_quantity,
          item_status,
          user_response
        )
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg(error.message)
    } else {
      const requestsData = (data as any[]) || []

      // 1. 데이터 정제 (admin_options 파싱)
      requestsData.forEach(request => {
        request.request_items.forEach((item: any) => {
          if (typeof item.admin_options === 'string') {
            try {
              item.admin_options = JSON.parse(item.admin_options)
            } catch (e) {
              item.admin_options = []
            }
          }
          if (!Array.isArray(item.admin_options)) {
            item.admin_options = []
          }
        })
      })

      setRequests(requestsData)



      // 2. 초기 선택값 설정
      const initialSelections: Record<string, {
        capacity?: string
        color?: string
        etc?: string
        quantity: number
        selectedOptionIndex?: number
      }> = {}

      requestsData.forEach(request => {
        request.request_items.forEach((item: any) => {
          if (item.user_selected_options) {
            let optionIndex = -1;
            if (item.admin_options && item.user_selected_options.optionName) {
              optionIndex = item.admin_options.findIndex((opt: any) => opt.name === item.user_selected_options.optionName)
            }

            initialSelections[item.id] = {
              capacity: item.user_selected_options.capacity,
              color: item.user_selected_options.color,
              etc: item.user_selected_options.etc,
              quantity: item.user_quantity || 1,
              selectedOptionIndex: optionIndex !== -1 ? optionIndex : undefined
            }
          } else {
            initialSelections[item.id] = {
              quantity: item.user_quantity || 1,
            }
          }
        })
      })
      setItemSelections(initialSelections)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const handleOptionChange = (itemId: string, field: 'capacity' | 'color' | 'etc', value: string) => {
    setItemSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const handleQuantityChange = (itemId: string, delta: number) => {
    setItemSelections(prev => {
      const current = prev[itemId]?.quantity || 1
      const newQuantity = Math.max(1, current + delta)
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: newQuantity,
        },
      }
    })
  }

  const handleNewOptionSelect = (itemId: string, index: number) => {
    setItemSelections(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selectedOptionIndex: index
      }
    }))
  }

  const parseOptions = (optionsString: string | null): string[] => {
    if (!optionsString) return []
    return optionsString.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }

  // --- Helpers ---
  const calculateTotal = (item: RequestItem): number => {
    const quantity = itemSelections[item.id]?.quantity || item.user_quantity || 1

    // 신규 옵션 시스템 가격
    if (Array.isArray(item.admin_options) && item.admin_options.length > 0) {
      const idx = itemSelections[item.id]?.selectedOptionIndex
      if (idx !== undefined && idx >= 0 && item.admin_options[idx]) {
        return item.admin_options[idx].price * quantity
      }
      return 0
    }

    if (!item.admin_price) return 0
    return item.admin_price * quantity
  }

  const calculateRequestTotal = (request: Request): number => {
    return request.request_items.reduce((sum, item) => {
      // 구매 불가 상태는 제외
      if (item.item_status === 'rejected') return sum
      return sum + calculateTotal(item)
    }, 0)
  }

  const calculateShipping = (request: Request): number => {
    const totalWeight = request.request_items.reduce((sum, item) => {
      if (item.item_status === 'rejected') return sum
      const quantity = itemSelections[item.id]?.quantity || item.user_quantity || 1
      return sum + (item.admin_weight || 0) * quantity
    }, 0)

    // 배송비 정책: 1kg당 150,000 VND (최소 0.5kg)
    // 하지만 단순하게 kg * 150,000 으로 적용하거나, 정책에 따라 다름.
    // 여기서는 1kg당 150,000 VND 로 계산.
    return totalWeight * 150000
  }

  const calculateGrandTotal = (request: Request): number => {
    return calculateRequestTotal(request) + calculateShipping(request)
  }

  const handleRequestCheckout = async (request: Request) => {
    // 1. 선택된 옵션들 저장
    const selectionsToSave = request.request_items.map(item => {
      const selection = itemSelections[item.id]
      if (!selection) return null

      let optionName = undefined
      let price = undefined

      // 옵션이 있는 경우
      if (item.admin_options && item.admin_options.length > 0 && selection.selectedOptionIndex !== undefined) {
        const opt = item.admin_options[selection.selectedOptionIndex]
        optionName = opt.name
        price = opt.price
      } else if (item.admin_price) {
        // 옵션이 없지만 기본 단가가 있는 경우
        price = item.admin_price
      }

      return {
        itemId: item.id,
        quantity: selection.quantity,
        selectedOptionIndex: selection.selectedOptionIndex,
        optionName,
        price
      }
    }).filter(Boolean)

    if (selectionsToSave.length > 0) {
      // 동적 임포트로 순환 참조 방지 또는 Server Action 직접 호출
      const { saveItemSelections } = await import('../actions/save-selections')
      const result = await saveItemSelections(selectionsToSave as any)
      if (!result.success) {
        alert('주문 정보를 저장하는데 실패했습니다.')
        return
      }
    }

    router.push(`/checkout?requestId=${request.id}`)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    // Dynamic import to avoid circular dep issues in client component if any (though here it's fine)
    const { deleteRequestItem } = await import('../actions/request-item')
    const result = await deleteRequestItem(itemId)

    if (result.success) {
      alert('삭제되었습니다.')
      loadData() // Reload data
    } else {
      alert('삭제 실패: ' + result.error)
    }
  }

  const handleResponseChange = (itemId: string, value: string) => {
    setResponseInputs(prev => ({ ...prev, [itemId]: value }))
  }

  const handleSubmitResponse = async (itemId: string) => {
    const response = responseInputs[itemId]
    if (!response || !response.trim()) {
      alert('답변을 입력해주세요.')
      return
    }

    const { submitUserResponse } = await import('../actions/request-item')
    const result = await submitUserResponse(itemId, response)

    if (result.success) {
      alert('전송되었습니다.')
      loadData()
    } else {
      alert('전송 실패: ' + result.error)
    }
  }

  const toggleDeleteItem = (itemId: string) => {
    const newSet = new Set(selectedDeleteItems)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedDeleteItems(newSet)
  }

  const handleDeleteSelected = async () => {
    if (selectedDeleteItems.size === 0) return
    if (!confirm('선택한 상품을 내 목록에서 삭제하시겠습니까? (관리자는 계속 볼 수 있습니다)')) return

    const { hideRequestItems } = await import('../actions/request-item')
    const result = await hideRequestItems(Array.from(selectedDeleteItems))

    if (result.success) {
      alert('삭제되었습니다.')
      setSelectedDeleteItems(new Set())
      loadData()
    } else {
      alert('삭제 실패: ' + result.error)
    }
  }

  const getStatusBadge = (req: Request) => {
    // 상품 준비중 상태 확인 (주문됨 + 입금완료) - Legacy compatible
    if (req.status === 'ordered' && req.payment_status === 'deposit_paid') {
      return <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-indigo-100 text-indigo-800 border-indigo-300">상품 준비중 📦</span>
    }

    const badges: Record<string, React.ReactNode> = {
      pending: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-yellow-100 text-yellow-800 border-yellow-300">{t('mypage.status.pending')}</span>,
      reviewed: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-blue-100 text-blue-800 border-blue-300">{t('mypage.status.reviewed')}</span>,
      ordered: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-green-100 text-green-800 border-green-300">{t('mypage.status.ordered')}</span>,
      purchased: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-sky-100 text-sky-800 border-sky-300">{t('mypage.status.purchased')} ✅</span>,
      shipped_kr: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-indigo-100 text-indigo-800 border-indigo-300">{t('mypage.status.shipped_kr')} 🚚</span>,
      shipped_vn: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-purple-100 text-purple-800 border-purple-300">{t('mypage.status.shipped_vn')} ✈️</span>,
      arrived: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-orange-100 text-orange-800 border-orange-300">{t('mypage.status.arrived')} 🇻🇳</span>,
      completed: <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-slate-100 text-slate-800 border-slate-300">{t('mypage.status.completed')} 🎉</span>
    }

    return badges[req.status] || badges['pending']
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="p-10">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 flex justify-between items-center">
          <h1 className="text-lg font-black text-slate-900">{t('mypage.title')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded font-bold"
            >
              {t('mypage.main')}
            </button>
            <LanguageSwitcher />
            <button onClick={handleLogout} className="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded font-bold">{t('mypage.logout')}</button>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white p-10 rounded text-center">No Requests</div>
        ) : (
          <div className="space-y-4">
            {/* 상단 일괄 삭제 버튼 */}
            {/* 상단 일괄 삭제 버튼 (DB 업데이트 전까지 임시 비활성화)
            {selectedDeleteItems.size > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                >
                  선택 삭제 ({selectedDeleteItems.size})
                </button>
              </div>
            )} */}

            {requests.map(req => (
              <div key={req.id} className="bg-white p-2.5 rounded-lg shadow-sm border">
                {/* 헤더: 날짜 및 상태 */}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(req.created_at).toLocaleString()}
                  </span>

                  <div className="flex gap-2">
                    {getStatusBadge(req)}
                  </div>
                </div>

                {/* 주문/결제 정보 (주문됨 상태일 때) */}
                {req.status === 'ordered' && (
                  <div className="bg-indigo-50 p-2.5 rounded mb-2.5">
                    <h3 className="text-indigo-900 font-bold mb-1 text-xs">주문/결제 정보</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span>입금 상태</span>
                      {req.payment_status === 'deposit_paid'
                        ? <span className="text-green-600 font-bold">입금 완료 ✅</span>
                        : <span className="text-yellow-600 font-bold">입금 대기 (선금 70% 필요)</span>
                      }
                    </div>
                  </div>
                )}

                {/* 상품 목록 */}
                <div className="space-y-2">
                  {req.request_items.map(item => (
                    <div key={item.id} className="border-t pt-2.5 mt-2.5 first:border-0 first:pt-0">
                      <div className="flex gap-4 items-start">
                        {/* 삭제 선택 체크박스 (임시 비활성화) */}
                        {/* <div className="pt-8">
                          <input
                            type="checkbox"
                            checked={selectedDeleteItems.has(item.id)}
                            onChange={() => toggleDeleteItem(item.id)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div> */}

                        {/* 썸네일 */}
                        <div className="w-14 h-14 bg-slate-100 rounded flex-shrink-0 overflow-hidden border">
                          {item.og_image ? (
                            <img src={item.og_image} alt={item.og_title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <span className="text-[10px]">No Image</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 line-clamp-2 mb-1 text-xs">
                            {item.og_title}
                          </h3>

                          {/* 상품 구분: 구매완료(Ordered) vs 텍스트 전송(User Response) */}
                          {req.status === 'ordered' ? (
                            <div className="mt-1 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                              <div className="flex justify-between items-center text-slate-700">
                                <span className="font-bold text-[10px]">수량: {itemSelections[item.id]?.quantity || item.user_quantity}</span>
                                <span className="font-bold text-indigo-600 text-[10px]">
                                  {(calculateTotal(item) > 0 ? calculateTotal(item).toLocaleString() + ' VND' : '가격 미정')}
                                </span>
                              </div>
                              {item.user_selected_options && item.user_selected_options.optionName && (
                                <div className="text-[10px] text-slate-500 mt-0.5">옵션: {item.user_selected_options.optionName}</div>
                              )}
                            </div>
                          ) : item.user_response ? (
                            <div className="mt-1 bg-yellow-50 p-2 rounded border border-yellow-100">
                              <span className="text-[10px] font-bold text-yellow-800 block mb-0.5">📝 요청:</span>
                              <p className="text-xs text-slate-700">{item.user_response}</p>
                            </div>
                          ) : (
                            // 기본 표시 (아직 구매도 안했고, 답변도 안보낸 상태)
                            <div className="text-slate-500 text-[10px] mt-1">
                              {t('mypage.quantity')}: {item.user_quantity || 1}
                            </div>
                          )}

                          {/* 상태별 UI 분기 (기존 로직 유지) */}
                          {item.item_status === 'rejected' ? (
                            <div className="bg-red-50 p-3 rounded-lg text-sm space-y-2 mt-2 border border-red-100">
                              <div className="flex items-start gap-2 text-red-700">
                                <span className="font-bold shrink-0">⛔ 구매 불가:</span>
                                <span>{item.admin_rerequest_note || '관리자 사유 미입력'}</span>
                              </div>
                            </div>
                          ) : item.item_status === 'needs_info' ? (
                            <div className="bg-yellow-50 p-3 rounded-lg text-sm space-y-2 mt-2 border border-yellow-100">
                              <div className="flex items-start gap-2 text-yellow-800 mb-2">
                                <span className="font-bold shrink-0">❓ 정보 요청:</span>
                                <span>{item.admin_rerequest_note || '추가 정보가 필요합니다.'}</span>
                              </div>
                              <div className="pl-6">
                                <p className="text-xs text-slate-500 mb-1">답변 입력 (ex: 사이즈/색상 상세)</p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={responseInputs[item.id] || ''}
                                    onChange={(e) => handleResponseChange(item.id, e.target.value)}
                                    placeholder="답변을 입력해주세요"
                                    className="flex-1 px-3 py-2 border rounded text-xs text-slate-900 placeholder:text-slate-400"
                                  />
                                  <button
                                    onClick={() => handleSubmitResponse(item.id)}
                                    className="px-3 py-2 bg-yellow-500 text-white rounded text-xs font-bold hover:bg-yellow-600"
                                  >
                                    전송
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : req.status === 'reviewed' ? (
                            <>
                              {/* 관리자 메모 */}
                              {item.admin_rerequest_note && (
                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800 mb-2">
                                  <span className="font-bold">📢 관리자 메시지:</span> {item.admin_rerequest_note}
                                </div>
                              )}

                              <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2 mt-2 border border-slate-100">
                                {/* 가격 */}
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-bold">{t('mypage.unitPrice')}</span>
                                  <span className="font-bold text-slate-900">
                                    {(item.admin_options && item.admin_options.length > 0)
                                      ? (itemSelections[item.id]?.selectedOptionIndex !== undefined
                                        ? `₩${item.admin_options[itemSelections[item.id]!.selectedOptionIndex!].price.toLocaleString()}`
                                        : '옵션을 선택해주세요')
                                      : (item.admin_price ? `₩${item.admin_price.toLocaleString()}` : '단가 미정')}
                                  </span>
                                </div>

                                {/* 옵션 선택 */}
                                {item.admin_options && item.admin_options.length > 0 && (
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{t('mypage.selectOption')}</label>
                                    <div className="flex flex-wrap gap-2">
                                      {item.admin_options.map((opt, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleNewOptionSelect(item.id, idx)}
                                          className={`px-2 py-1 text-xs rounded border ${itemSelections[item.id]?.selectedOptionIndex === idx
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-slate-600 border-slate-200'
                                            }`}
                                        >
                                          {opt.name} (+₩{opt.price.toLocaleString()})
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* 기타 옵션 */}
                                {item.admin_capacity && (
                                  <div className="text-xs text-slate-500">
                                    <span className="font-bold">Capacity:</span> {item.admin_capacity}
                                  </div>
                                )}

                                {/* 수량 조절 */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                  <span className="font-bold text-slate-500">{t('mypage.quantity')}</span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleQuantityChange(item.id, -1)}
                                      disabled={item.item_status === 'approved'}
                                      className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold w-6 text-center text-slate-900">{itemSelections[item.id]?.quantity || 1}</span>
                                    <button
                                      onClick={() => handleQuantityChange(item.id, 1)}
                                      disabled={item.item_status === 'approved'}
                                      className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 실시간 견적 합계 & 결제 버튼 */}
                  {req.status === 'reviewed' && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="bg-indigo-50 p-3 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                          <span>상품 금액</span>
                          <span>{calculateRequestTotal(req).toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center mb-1 text-xs text-slate-500">
                          <span>배송비 (무게 기반)</span>
                          <span>+{calculateShipping(req).toLocaleString()} VND</span>
                        </div>
                        <div className="border-t border-indigo-200 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-bold text-xs">{t('mypage.checkout.total')}</span>
                          <span className="text-base font-black text-indigo-700">
                            {calculateGrandTotal(req).toLocaleString()} VND
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequestCheckout(req)}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md active:scale-95 transition-all text-sm"
                      >
                        {t('mypage.checkout')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Zalo 문의 버튼 (항상 표시) */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                  >
                    {t('mypage.zalo_inquiry')}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div >
  )
}
