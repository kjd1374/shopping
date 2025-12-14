'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUsers, updateUserRole, deleteUser } from '../../actions/admin' // deleteUser 추가

interface UserProfile {
    id: string
    email: string
    role: 'user' | 'partner' | 'admin'
    created_at: string
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const result = await getUsers()
            if (result.success && result.data) {
                setUsers(result.data as UserProfile[])
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!confirm(`정말 이 사용자의 권한을 ${newRole}(으)로 변경하시겠습니까?`)) return

        try {
            const result = await updateUserRole(userId, newRole as 'user' | 'partner' | 'admin')
            if (result.success) {
                alert('권한이 변경되었습니다.')
                fetchUsers() // 목록 새로고침
            } else {
                alert('권한 변경 실패: ' + result.error)
            }
        } catch (error: any) {
            alert('오류 발생: ' + error.message)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push('/admin')}
                            className="text-sm text-slate-600 hover:text-slate-900 mb-2 flex items-center gap-1"
                        >
                            ← 관리자 홈으로
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">사용자 권한 관리</h1>
                        <p className="text-sm text-slate-500">전체 회원 목록 및 등급 관리</p>
                    </div>
                </div>

                {/* 유저 리스트 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        이메일
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        현재 권한
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        가입일
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        권한 변경
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            가입된 사용자가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : user.role === 'partner'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1"
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                >
                                                    <option value="user">User (일반)</option>
                                                    <option value="partner">Partner (파트너)</option>
                                                    <option value="admin">Admin (관리자)</option>
                                                </select>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('정말 이 사용자를 삭제하시겠습니까? (복구 불가)')) return
                                                        try {
                                                            const result = await deleteUser(user.id)
                                                            if (result.success) {
                                                                alert('사용자가 삭제되었습니다.')
                                                                fetchUsers()
                                                            } else {
                                                                alert('삭제 실패: ' + result.error)
                                                            }
                                                        } catch (e: any) {
                                                            alert('오류: ' + e.message)
                                                        }
                                                    }}
                                                    className="ml-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
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
            </div>
        </div>
    )
}
