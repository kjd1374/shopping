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
  admin_color: string | null
  admin_etc: string | null
  admin_rerequest_note: string | null
  user_selected_options: Record<string, string> | null
  user_quantity: number
  item_status: 'pending' | 'approved' | 'rejected' | 'needs_info'
  user_response: string | null
  is_buyable?: boolean
}

interface Request {
  id: string
  status: 'pending' | 'reviewed' | 'ordered'
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

  const handleRequestCheckout = async (request: Request) => {
    // 1. 모든 아이템에 대해 옵션 저장 실행 (지금은 간단히 라우팅만)
    // TODO: Restore full validation logic
    router.push(`/checkout?requestId=${request.id}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reviewed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-blue-100 text-blue-800 border-blue-300">{t('mypage.status.reviewed')}</span>
      case 'ordered':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-green-100 text-green-800 border-green-300">{t('mypage.status.ordered')}</span>
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-md border bg-yellow-100 text-yellow-800 border-yellow-300">{t('mypage.status.pending')}</span>
    }
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-black">{t('mypage.title')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="text-xs bg-slate-900 text-white px-3 py-1 rounded font-bold"
            >
              {t('mypage.main')}
            </button>
            <LanguageSwitcher />
            <button onClick={handleLogout} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded font-bold">{t('mypage.logout')}</button>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white p-10 rounded text-center">No Requests</div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white p-4 rounded shadow border">
                <div className="flex justify-between mb-4">
                  <span className="font-bold">{formatDate(req.created_at)}</span>
                  {getStatusBadge(req.status)}
                </div>
                {req.status === 'ordered' && (
                  <div className="bg-indigo-50 p-4 rounded mb-4">
                    <h3 className="text-indigo-900 font-bold mb-2">주문/결제 정보</h3>
                    <div className="flex justify-between items-center">
                      <span>입금 상태</span>
                      {req.payment_status === 'deposit_paid'
                        ? <span className="text-green-600 font-bold">입금 완료 ✅</span>
                        : <span className="text-yellow-600 font-bold">입금 대기 (선금 70% 필요)</span>
                      }
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="space-y-4">
                    {req.request_items.map(item => (
                      <div key={item.id} className="border-t pt-4 mt-2 first:border-0 first:pt-0">
                        <div className="flex gap-4">
                          {/* 썸네일 */}
                          <div className="w-20 h-20 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border">
                            {item.og_image ? (
                              <img src={item.og_image} alt={item.og_title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="text-xs">No Image</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <p className="font-bold text-sm mb-1">{item.og_title}</p>

                            {/* 상태별 UI */}
                            {req.status === 'reviewed' ? (
                              <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2 mt-2">
                                {/* 가격 표시 */}
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-bold">{t('mypage.unitPrice')}</span>
                                  <span className="font-bold text-slate-900">
                                    {/* 옵션 가격 또는 기본 가격 */}
                                    {(item.admin_options && item.admin_options.length > 0 && itemSelections[item.id]?.selectedOptionIndex !== undefined)
                                      ? `₩${item.admin_options[itemSelections[item.id]!.selectedOptionIndex!].price.toLocaleString()}`
                                      : (item.admin_price ? `₩${item.admin_price.toLocaleString()}` : '미정')}
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

                                {/* 기타 옵션들 (단순 텍스트) */}
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
                                      className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold w-4 text-center">{itemSelections[item.id]?.quantity || 1}</span>
                                    <button
                                      onClick={() => handleQuantityChange(item.id, 1)}
                                      className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">수량: {item.user_quantity}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 결제 버튼 (Reviewed 상태일 때만) */}
                    {req.status === 'reviewed' && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => handleRequestCheckout(req)}
                          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md active:scale-95 transition-all"
                        >
                          {t('mypage.checkout')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
