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
      setRequests(data as any)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
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
            <LanguageSwitcher />
            <button onClick={handleLogout} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded">Logout</button>
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
                  {req.request_items.map(item => (
                    <div key={item.id} className="border-t pt-2 mt-2">
                      <p className="font-bold">{item.og_title}</p>
                      <p className="text-sm text-gray-500">수량: {item.user_quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
