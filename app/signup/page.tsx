'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '../actions/auth'
import { toast } from 'sonner'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { HO_CHI_MINH_CITY, HCMC_DISTRICTS } from '../lib/vn-location-data'

export default function SignupPage() {
    const { t } = useLanguage()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')

    // Address State
    const [city] = useState(HO_CHI_MINH_CITY)
    const [district, setDistrict] = useState('')
    const [ward, setWard] = useState('')
    const [street, setStreet] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Combine address components: "Street, Ward, District, City"
            const fullAddress = `${street}, ${ward}, ${district}, ${city}`

            const result = await signUp(email, password, {
                fullName: name,
                phone,
                address: fullAddress
            })

            if (result?.success) {
                toast.success('회원가입이 완료되었습니다!')
                // 로그인 상태로 간주하고 메인으로 이동
                router.push('/')
                router.refresh()
            } else {
                setError(result?.error || '회원가입에 실패했습니다.')
                setLoading(false)
            }
        } catch (err: any) {
            setError(err.message || '회원가입에 실패했습니다.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                    <div className="text-right mb-2">
                        <LanguageSwitcher />
                    </div>
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-slate-900 mb-2">{t('header.title')}</h1>
                        <p className="text-sm text-slate-500">{t('auth.signup')}</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                            <div className="font-bold mb-1">오류 발생</div>
                            <div>{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.name')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Hong Gil Dong"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">이메일 (Email)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="example@email.com"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">비밀번호 (Password)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                disabled={loading}
                            />
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-2">
                            <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase">배송 정보 (Shipping Info)</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">연락처 (Phone)</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        placeholder="010-1234-5678"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('auth.address')}</label>

                                    {/* City - Fixed */}
                                    <div className="mb-2">
                                        <span className="text-xs text-slate-500 font-bold mb-1 block">Tỉnh / Thành phố</span>
                                        <input
                                            type="text"
                                            value={city}
                                            disabled
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex gap-2 mb-2">
                                        {/* District */}
                                        <div className="flex-1">
                                            <span className="text-xs text-slate-500 font-bold mb-1 block">Quận / Huyện</span>
                                            <select
                                                value={district}
                                                onChange={(e) => setDistrict(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                disabled={loading}
                                            >
                                                <option value="">Select District</option>
                                                {HCMC_DISTRICTS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Ward */}
                                        <div className="flex-1">
                                            <span className="text-xs text-slate-500 font-bold mb-1 block">Phường / Xã</span>
                                            <input
                                                type="text"
                                                value={ward}
                                                onChange={(e) => setWard(e.target.value)}
                                                required
                                                placeholder="Phường/Xã"
                                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    {/* Street */}
                                    <div>
                                        <span className="text-xs text-slate-500 font-bold mb-1 block">Số nhà, Tên đường</span>
                                        <input
                                            type="text"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            required
                                            placeholder="House No, Street Name"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-400"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex flex-col gap-3 mt-6'>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? '...' : t('auth.signupButton')}
                            </button>

                            <Link
                                href="/login"
                                className="block w-full text-center py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                {t('auth.hasAccount')} {t('auth.goLogin')}
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
