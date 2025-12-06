'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRequests } from '../actions/admin'

interface Request {
  id: string
  user_id: string | null
  status: 'pending' | 'reviewed' | 'ordered'
  created_at: string
  representative_title: string
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const result = await getRequests()
      if (result.success && result.data) {
        setRequests(result.data as Request[])
      } else {
        console.error('Failed to fetch requests:', result.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">로딩 중...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">관리자 대시보드</h1>
            <p className="text-sm text-slate-500">고객 요청 관리</p>
          </div>
          <a
            href="/admin/migrate"
            className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-2 rounded-lg hover:bg-yellow-200 transition-colors"
          >
            🔧 DB 마이그레이션
          </a>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    요청일시
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    고객ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    대표 상품명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {request.user_id ? (
                          <span className="font-mono text-xs">{request.user_id.substring(0, 8)}...</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 max-w-md truncate">
                        {request.representative_title}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/admin/requests/${request.id}`)}
                          className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 active:scale-95 transition-all"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={fetchRequests}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            🔄 새로고침
          </button>
        </div>
      </div>
    </div>
  )
}
