'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { scrapeOliveYoungRanking } from './actions/scrape-ranking'
import { useRouter } from 'next/navigation'
import RequestSection, { type RequestSectionRef } from './components/RequestSection'
import LanguageSwitcher from './components/LanguageSwitcher'
import { useLanguage } from './contexts/LanguageContext'
import { createClient } from './lib/supabase/client'

interface Product {
  id: string
  rank: number
  title: string
  brand: string
  image: string
  origin_url: string
}

type Category = 'beauty' | 'fashion'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('beauty')
  const [isScraping, setIsScraping] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const requestSectionRef = useRef<RequestSectionRef>(null)

  // 로그인 상태 확인
  useEffect(() => {
    checkAuth()
    // 인증 상태 변경 감지
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  // 데이터 로드 함수
  const fetchProducts = async (cat: Category) => {
    setLoading(true)
    const type = cat === 'beauty' ? 'ranking_beauty' : 'ranking_fashion'

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('product_type', type)
      .order('rank', { ascending: true })
      .limit(10)

    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts(category)
  }, [category])

  const handleUpdateRanking = async () => {
    if (category !== 'beauty') {
      alert(t('ranking.updateOnlyBeauty'))
      return
    }
    if (!confirm(t('ranking.updateConfirm'))) return

    setIsScraping(true)
    try {
      const result = await scrapeOliveYoungRanking()
      if (result.success) {
        alert(`${t('ranking.updateSuccess')} (${result.count} ${t('language.products')})`)
        fetchProducts(category)
      } else {
        alert(`${t('ranking.updateFailed')}: ${result.error}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(`${t('ranking.systemError')}: ${msg}`)
    } finally {
      setIsScraping(false)
    }
  }

  const handleRequest = (product: Product) => {
    // RequestSection에 자동으로 추가
    if (requestSectionRef.current) {
      const success = requestSectionRef.current.addProduct({
        title: product.title,
        image: product.image,
        url: product.origin_url,
      })
      if (success) {
        // 성공 시 스크롤을 RequestSection으로 이동
        setTimeout(() => {
          const requestSection = document.querySelector('section[class*="mt-8"]')
          if (requestSection) {
            requestSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 relative">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100 px-4 h-14 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-600">
          {t('header.title')}
        </h1>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={() => router.push('/mypage')}
              className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform"
            >
              {t('header.myRequests')}
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform"
            >
              로그인
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* 탭 메뉴 */}
        <div className="flex p-1 mx-4 mt-6 mb-6 bg-slate-200/50 rounded-xl">
          {(['beauty', 'fashion'] as Category[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setCategory(tab)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${category === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab === 'beauty' ? t('tab.beauty') : t('tab.fashion')}
            </button>
          ))}
        </div>

        {/* 랭킹 섹션 */}
        <section className="px-4 mb-8">
          <div className="flex items-baseline justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-800">
              {category === 'beauty' ? t('ranking.title.beauty') : t('ranking.title.fashion')}
            </h2>
            <span className="text-xs text-slate-400 font-medium">{t('ranking.top10')}</span>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-32 flex-shrink-0 aspect-[3/4] bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-400 text-sm">
                {category === 'fashion' ? t('ranking.fashion.empty') : t('ranking.empty')}
              </p>
              {category === 'beauty' && (
                <button
                  onClick={handleUpdateRanking}
                  className="mt-3 text-xs text-blue-500 underline font-bold"
                >
                  {t('ranking.fetch')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group relative w-36 flex-shrink-0 snap-start flex flex-col"
                >
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 mb-2">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center bg-black/80 text-white font-bold text-sm rounded-br-xl backdrop-blur-sm">
                      {product.rank}
                    </div>
                  </div>

                  <div className="px-0.5">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5 truncate">
                      {product.brand}
                    </p>
                    <h3 className="text-xs font-medium text-slate-900 line-clamp-2 h-8 leading-tight mb-2">
                      {product.title}
                    </h3>

                    <button
                      onClick={() => handleRequest(product)}
                      className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
                    >
                      {t('ranking.button')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-slate-100 my-8" />

        {/* 스마트 견적 요청 섹션 (컴포넌트) */}
        <RequestSection ref={requestSectionRef} />

      </div>

      {/* 관리자용 업데이트 버튼 */}
      {category === 'beauty' && (
        <button
          onClick={handleUpdateRanking}
          disabled={isScraping}
          className={`fixed bottom-4 right-4 bg-slate-800 text-white p-3 rounded-full shadow-lg z-50 transition-all active:scale-90 ${isScraping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
          title="랭킹 업데이트"
        >
          {isScraping ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          )}
        </button>
      )}
    </main>
  )
}
