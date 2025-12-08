'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRequests, createShipmentBatch, assignRequestsToBatch, deleteRequests } from '../actions/admin'
import { signOut } from '../actions/auth'
import { toast } from 'sonner'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreatingBatch, setIsCreatingBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newTrackingNo, setNewTrackingNo] = useState('')

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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleCreateBatch = async () => {
    if (selectedIds.size === 0) return
    if (!newBatchName || !newTrackingNo) {
      alert('배치명과 송장번호를 입력해주세요.')
      return
    }

    try {
      // 1. 배치 생성
      const batchResult = await createShipmentBatch(newBatchName, newTrackingNo)
      if (!batchResult.success || !batchResult.data) {
        throw new Error(batchResult.error || '배치 생성 실패')
      }

      // 2. 요청 할당
      const assignResult = await assignRequestsToBatch(
        batchResult.data.id,
        Array.from(selectedIds)
      )

      if (!assignResult.success) {
        throw new Error(assignResult.error || '요청 할당 실패')
      }

      toast.success('배송 배치가 생성되었습니다!')
      setIsCreatingBatch(false)
      setSelectedIds(new Set())
      setNewBatchName('')
      setNewTrackingNo('')
      fetchRequests()
      router.push('/admin/batches')

    } catch (error) {
      toast.error('오류 발생: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm('정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.')) return

    try {
      const result = await deleteRequests(ids)
      if (result.success) {
        toast.success(`삭제되었습니다. (${ids.length}건)`)
        setSelectedIds(new Set())
        fetchRequests()
      } else {
        toast.error('삭제 실패: ' + result.error)
      }
    } catch (error) {
      toast.error('오류 발생: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }


  const handleLogout = async () => {
    if (!confirm('정말 로그아웃 하시겠습니까?')) return

    try {
      const result = await signOut()
      if (result.success) {
        toast.success('로그아웃 되었습니다.')
        router.push('/')
      } else {
        toast.error('로그아웃 실패')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">관리자 대시보드</h1>
            <p className="text-sm text-slate-500">고객 요청 관리</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/users"
              className="text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              👥 사용자 관리
            </a>
            <a
              href="/admin/batches"
              className="text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              📦 배송 배치 관리
            </a>
            <a
              href="/admin/migrate"
              className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-2 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              🔧 DB 마이그레이션
            </a>
            <div className="w-px h-6 bg-slate-300 mx-1 hidden md:block"></div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-700 bg-red-100 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
            >
              🚪 로그아웃
            </button>
          </div>
        </div>

        {/* 액션 바 (선택 시 표시) */}
        {selectedIds.size > 0 && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="font-bold text-indigo-900">{selectedIds.size}개 선택됨</span>
              {isCreatingBatch ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="배치명 (예: 12/06 1차)"
                    className="px-3 py-1.5 text-sm border rounded"
                    value={newBatchName}
                    onChange={e => setNewBatchName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="송장번호"
                    className="px-3 py-1.5 text-sm border rounded"
                    value={newTrackingNo}
                    onChange={e => setNewTrackingNo(e.target.value)}
                  />
                  <button
                    onClick={handleCreateBatch}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setIsCreatingBatch(false)}
                    className="px-3 py-1.5 bg-white text-slate-600 text-sm font-bold rounded hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingBatch(true)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  📦 선택한 항목 배송처리 (배치 생성)
                </button>
              )}
            </div>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              🗑️ 선택 삭제
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              선택 해제
            </button>
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(requests.map(r => r.id)))
                        } else {
                          setSelectedIds(new Set())
                        }
                      }}
                      checked={requests.length > 0 && selectedIds.size === requests.length}
                    />
                  </th>
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
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                      요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedIds.has(request.id)}
                          onChange={() => toggleSelection(request.id)}
                        />
                      </td>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete([request.id])
                          }}
                          className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 active:scale-95 transition-all ml-2"
                        >
                          삭제
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
