'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import { signOut } from '../actions/auth'
import { confirmOrder } from '../actions/order'

interface RequestItem {
  id: string
  og_title: string
  og_image: string | null
  admin_price: number | null
  admin_capacity: string | null
  admin_color: string | null
  admin_etc: string | null
  admin_rerequest_note: string | null
  user_selected_options: Record<string, string> | null
  user_quantity: number
}

interface Request {
  id: string
  status: 'pending' | 'reviewed' | 'ordered'
  created_at: string
  request_items: RequestItem[]
}

export default function MyPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [itemSelections, setItemSelections] = useState<Record<string, {
    capacity?: string
    color?: string
    etc?: string
    quantity: number
  }>>({})
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    
    // 현재 사용자 확인
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      router.push('/login')
      return
    }

    setUser(currentUser)

    // 내 요청 목록 조회
    const { data, error } = await supabase
      .from('requests')
      .select(`
        id,
        status,
        created_at,
        request_items (
          id,
          og_title,
          og_image,
          admin_price,
          admin_capacity,
          admin_color,
          admin_etc,
          admin_rerequest_note,
          user_selected_options,
          user_quantity
        )
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading requests:', error)
    } else {
      const requestsData = (data as Request[]) || []
      setRequests(requestsData)
      
      // 초기 선택값 설정 (이미 선택된 값이 있으면 사용, 없으면 빈 값)
      const initialSelections: Record<string, {
        capacity?: string
        color?: string
        etc?: string
        quantity: number
      }> = {}
      
      requestsData.forEach(request => {
        request.request_items.forEach(item => {
          if (item.user_selected_options) {
            initialSelections[item.id] = {
              capacity: item.user_selected_options.capacity,
              color: item.user_selected_options.color,
              etc: item.user_selected_options.etc,
              quantity: item.user_quantity || 1,
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
        quantity: prev[itemId]?.quantity || 1,
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

  const handleConfirmOrder = async (itemId: string) => {
    const selection = itemSelections[itemId]
    if (!selection) {
      alert('옵션을 선택해주세요.')
      return
    }

    const selectedOptions: Record<string, string> = {}
    if (selection.capacity) selectedOptions.capacity = selection.capacity
    if (selection.color) selectedOptions.color = selection.color
    if (selection.etc) selectedOptions.etc = selection.etc

    const result = await confirmOrder(itemId, selectedOptions, selection.quantity)
    
    if (result.success) {
      alert('구매 요청이 완료되었습니다!')
      loadData() // 데이터 새로고침
    } else {
      alert('구매 요청에 실패했습니다: ' + result.error)
    }
  }

  const parseOptions = (optionsString: string | null): string[] => {
    if (!optionsString) return []
    return optionsString.split(',').map(s => s.trim()).filter(s => s.length > 0)
  }

  const calculateTotal = (item: RequestItem): number => {
    if (!item.admin_price) return 0
    const quantity = itemSelections[item.id]?.quantity || item.user_quantity || 1
    return item.admin_price * quantity
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      reviewed: 'bg-blue-100 text-blue-800 border-blue-300',
      ordered: 'bg-green-100 text-green-800 border-green-300',
    }
    const labels = {
      pending: '대기중',
      reviewed: '승인완료',
      ordered: '주문완료',
    }
    return (
      <span
        className={`px-2.5 py-1 text-xs font-bold rounded-md border ${styles[status as keyof typeof styles] || styles.pending}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">내 요청함</h1>
            <p className="text-sm text-slate-500">
              {user?.email || '사용자'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              메인으로
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 요청 목록 */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-400 mb-4">아직 요청한 상품이 없습니다.</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              견적 요청하러 가기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      {formatDate(request.created_at)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        요청 #{request.id.substring(0, 8)}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>

                {/* 상품 목록 */}
                <div className="space-y-6">
                  {request.request_items.map((item) => {
                    const isReviewed = request.status === 'reviewed'
                    const hasRerequestNote = !!item.admin_rerequest_note
                    const capacityOptions = parseOptions(item.admin_capacity)
                    const colorOptions = parseOptions(item.admin_color)
                    const etcOptions = parseOptions(item.admin_etc)
                    const totalPrice = calculateTotal(item)

                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="flex gap-4 mb-4">
                          {item.og_image && (
                            <img
                              src={item.og_image}
                              alt={item.og_title}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 mb-2">
                              {item.og_title}
                            </p>
                            {item.admin_price && (
                              <p className="text-xs text-slate-600 mb-1">
                                단가: {item.admin_price.toLocaleString('vi-VN')} VND
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 재요청 안내 */}
                        {hasRerequestNote && (
                          <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                            <p className="text-xs font-bold text-red-800 mb-1">⚠️ 관리자 안내</p>
                            <p className="text-xs text-red-700">{item.admin_rerequest_note}</p>
                          </div>
                        )}

                        {/* 승인완료 상태일 때 옵션 선택 UI */}
                        {isReviewed && !hasRerequestNote && (
                          <div className="space-y-4 mb-4">
                            {/* 용량 선택 */}
                            {capacityOptions.length > 0 && (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                  용량 선택
                                </label>
                                {capacityOptions.length === 1 ? (
                                  <p className="text-sm text-slate-600">{capacityOptions[0]}</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {capacityOptions.map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => handleOptionChange(item.id, 'capacity', option)}
                                        className={`px-4 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                                          itemSelections[item.id]?.capacity === option
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 색상 선택 */}
                            {colorOptions.length > 0 && (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                  색상 선택
                                </label>
                                {colorOptions.length === 1 ? (
                                  <p className="text-sm text-slate-600">{colorOptions[0]}</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {colorOptions.map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => handleOptionChange(item.id, 'color', option)}
                                        className={`px-4 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                                          itemSelections[item.id]?.color === option
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 기타 옵션 */}
                            {etcOptions.length > 0 && (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                  기타 옵션
                                </label>
                                {etcOptions.length === 1 ? (
                                  <p className="text-sm text-slate-600">{etcOptions[0]}</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {etcOptions.map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => handleOptionChange(item.id, 'etc', option)}
                                        className={`px-4 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                                          itemSelections[item.id]?.etc === option
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 수량 조절 */}
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-2">
                                수량
                              </label>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleQuantityChange(item.id, -1)}
                                  className="w-10 h-10 bg-slate-200 text-slate-700 rounded-lg font-bold text-lg hover:bg-slate-300 active:scale-95 transition-all"
                                >
                                  −
                                </button>
                                <span className="text-lg font-bold text-slate-900 min-w-[3rem] text-center">
                                  {itemSelections[item.id]?.quantity || item.user_quantity || 1}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.id, 1)}
                                  className="w-10 h-10 bg-slate-200 text-slate-700 rounded-lg font-bold text-lg hover:bg-slate-300 active:scale-95 transition-all"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* 가격 계산기 */}
                            {item.admin_price && (
                              <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-700">예상 결제 금액</span>
                                  <span className="text-2xl font-black text-indigo-600">
                                    {totalPrice.toLocaleString('vi-VN')} VND
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 text-right">
                                  {item.admin_price.toLocaleString('vi-VN')} VND × {itemSelections[item.id]?.quantity || 1}개
                                </p>
                              </div>
                            )}

                            {/* 구매 요청하기 버튼 */}
                            <button
                              onClick={() => handleConfirmOrder(item.id)}
                              disabled={request.status !== 'reviewed' || hasRerequestNote}
                              className="w-full py-4 bg-indigo-600 text-white text-base font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98]"
                            >
                              구매 요청하기
                            </button>
                          </div>
                        )}

                        {/* 주문완료 상태일 때 */}
                        {request.status === 'ordered' && item.user_selected_options && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs font-bold text-green-800 mb-2">✅ 주문 완료</p>
                            <div className="text-xs text-green-700 space-y-1">
                              {item.user_selected_options.capacity && (
                                <p>용량: {item.user_selected_options.capacity}</p>
                              )}
                              {item.user_selected_options.color && (
                                <p>색상: {item.user_selected_options.color}</p>
                              )}
                              {item.user_selected_options.etc && (
                                <p>기타: {item.user_selected_options.etc}</p>
                              )}
                              <p>수량: {item.user_quantity}개</p>
                              {item.admin_price && (
                                <p className="font-bold mt-2">
                                  총액: {(item.admin_price * item.user_quantity).toLocaleString('vi-VN')} VND
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
