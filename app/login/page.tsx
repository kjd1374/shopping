'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, signOut } from '../actions/auth'
import { createClient } from '../lib/supabase/client'
import { toast } from 'sonner'


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Signup fields
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

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

    if (user) {
      // Check role and redirect if needed
      checkRoleAndRedirect(user.id)
    }
  }

  const checkRoleAndRedirect = async (userId: string) => {
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'admin') {
      router.push('/admin')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn(email, password)
      if (result?.success) {
        toast.success('로그인 성공!')

        // Admin check logic implies we need to wait or verify role.
        // For simpler UX, we can rely on middleware or client-side check.
        // Let's do a quick client-side check or just refresh.

        // We need to know who logged in to redirect correctly.
        // signIn action sets cookie, so we can get user now.
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profile?.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/')
          }
        } else {
          router.push('/')
        }

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
      const result = await signUp(email, password, {
        fullName: name,
        phone,
        address
      })
      if (result?.success) {
        // Auto-login is handled inside signUp action in our plan, or here?
        // Let's check the signUp implementation plan.
        // Plan said: "Update handleSignUp to automatically redirect/login if the signup action returns success (and implies login)."

        // If the server action 'signUp' already does auto-login (which the previous view_code_item showed it tries to), 
        // then we just need to handle success here.
        // The previous code showed `signUp` tries `signInWithPassword` after creating profile.

        if (result.message?.includes('로그인 완료')) {
          toast.success('회원가입 및 로그인 완료!')
          router.push('/')
          router.refresh()
        } else {
          // Case where auto-login failed but signup worked (or email confirm needed)
          toast.success(result.message || '회원가입이 완료되었습니다.')
          if (!result.message?.includes('로그인해주세요')) {
            // If it's a "silent" success that implies login (which our server action seems to attempt)
            // But wait, the `signUp` code item I viewed returns { success: true, message: '회원가입 및 로그인 완료' } on success.
            // So we can assume it's logged in.
            router.push('/')
            router.refresh()
          } else {
            setLoading(false)
          }
        }
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
            <p className="text-sm text-slate-500">{isSignUpMode ? '회원가입 (Sign Up)' : '로그인 (Login)'}</p>
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
              <form onSubmit={isSignUpMode ? handleSignUp : handleSignIn} className="space-y-4">

                {/* 회원가입 전용 필드 */}
                {isSignUpMode && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">이름 (Name)</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={isSignUpMode}
                        placeholder="Hong Gil Dong"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">연락처 (Phone)</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required={isSignUpMode}
                        placeholder="010-1234-5678"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">주소 (Address)</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required={isSignUpMode}
                        placeholder="Seoul, Gangnam-gu..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white"
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

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

                <div className='flex flex-col gap-3 mt-6'>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '처리 중...' : (isSignUpMode ? '가입하기' : '로그인')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUpMode(!isSignUpMode)
                      setError('')
                    }}
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSignUpMode ? '로그인으로 돌아가기' : '회원가입 하러가기'}
                  </button>
                </div>
              </form>
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

