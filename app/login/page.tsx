'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, signOut } from '../actions/auth'
import { createClient } from '../lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn(email, password)
      if (result?.success) {
        alert('로그인 성공!')
        router.push('/')
        router.refresh()
      } else {
        setError(result?.error || '로그인에 실패했습니다.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signUp(email, password)
      if (result?.success) {
        alert(result.message || '회원가입이 완료되었습니다. 로그인해주세요.')
        // 회원가입 후 로그인 페이지에 머물기 (자동 로그인 안 함)
        setLoading(false)
      } else {
        setError(result?.error || '회원가입에 실패했습니다.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsLoggedIn(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Vina-K</h1>
            <p className="text-sm text-slate-500">로그인 또는 회원가입</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <div className="font-bold mb-1">오류 발생</div>
              <div>
                {error.includes('Invalid login credentials') || error.includes('Invalid credentials')
                  ? '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 먼저 회원가입을 해주세요.'
                  : error}
              </div>
            </div>
          )}

          {/* 로그인 상태일 때 */}
          {isLoggedIn ? (
            <div className="text-center space-y-4">
              <p className="text-slate-600">이미 로그인되어 있습니다.</p>
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors"
              >
                로그아웃
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
              >
                메인으로 이동
              </button>
            </div>
          ) : (
            <>
              {/* 폼 */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '처리 중...' : '로그인'}
                </button>
              </form>

              <div className="mt-4">
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  회원가입
                </button>
              </div>
            </>
          )}

          {/* 테스트 계정 정보 */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-center text-slate-400 mb-2">
              💡 <span className="font-bold text-slate-500">테스트 계정이 없다면?</span>
            </p>
            <p className="text-xs text-center text-slate-400">
              먼저 <span className="font-mono font-bold text-slate-600">test@vinak.com</span> / <span className="font-mono font-bold text-slate-600">123456</span>로 <span className="font-bold text-slate-500">회원가입</span>을 해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

