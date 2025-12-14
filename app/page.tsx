'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { scrapeOliveYoungRanking } from './actions/scrape-ranking'
import { useRouter } from 'next/navigation'
import RequestSection, { type RequestSectionRef } from './components/RequestSection'
import RecentActivity from './components/RecentActivity'
import LanguageSwitcher from './components/LanguageSwitcher'
import { useLanguage } from './contexts/LanguageContext'
import { createClient } from './lib/supabase/client'
import { signOut } from './actions/auth'

interface Product {
  id: string
  rank: number
  title: string
  brand: string
  image: string
  origin_url: string
}


interface SubCategory {
  id: string
  name: string
}

type Category = 'beauty' | 'fashion'

const beautySubCategories: SubCategory[] = [
  { id: 'all', name: '전체' },
  { id: 'skincare', name: '스킨케어' },
  { id: 'maskpack', name: '마스크팩' },
  { id: 'cleansing', name: '클렌징' },
  { id: 'dermo', name: '더모 코스메틱' },
  { id: 'hair', name: '헤어케어' },
  { id: 'body', name: '바디케어' },
  { id: 'suncare', name: '선케어' },
  { id: 'makeup', name: '메이크업' },
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('beauty')
  const [subCategory, setSubCategory] = useState<SubCategory>(beautySubCategories[0])
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

  const handleLogout = async () => {
    await signOut()
    setIsLoggedIn(false)
    window.location.reload() // 상태 초기화를 위해 새로고침
  }

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
  }

  // 랭킹 업데이트 함수 (자동 모드 지원)
  const handleUpdateRanking = async (isAuto = false) => {
    if (category !== 'beauty') {
      if (!isAuto) alert(t('ranking.updateOnlyBeauty'))
      return
    }

    // 서브카테고리 이름 (스크래핑에 사용)
    const targetName = subCategory.id === 'all' ? '전체' : subCategory.name

    if (!isAuto && !confirm(`'${targetName}' ${t('ranking.updateConfirm')}`)) return

    setIsScraping(true)
    try {
      // 선택된 서브카테고리 이름 전달
      const result = await scrapeOliveYoungRanking(targetName) // scrape-ranking.ts must handle timeouts elegantly

      if (result.success) {
        if (!isAuto) alert(`${t('ranking.updateSuccess')} (${result.count} ${t('language.products')})`)
        // 재조회 (무한루프 방지를 위해 fetchProducts 직접 호출 대신 state 업데이트 등 고려 필요하지만,
        // 여기서는 데이터를 채웠으므로 다시 fetchProducts 호출해도 DB에 데이터가 있어 루프 안 돎)
        fetchProducts(category, subCategory, false) // false = retry 안함
      } else {
        if (!isAuto) alert(`${t('ranking.updateFailed')}: ${result.error}`)
        setLoading(false) // 실패 시 로딩 해제
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!isAuto) alert(`${t('ranking.systemError')}: ${msg}`)
      setLoading(false)
    } finally {
      setIsScraping(false)
    }
  }

  // 데이터 로드 함수
  const fetchProducts = async (cat: Category, sub: SubCategory, autoFetchIfNeeded = true) => {
    setLoading(true)

    let type = 'ranking_beauty'
    if (cat === 'fashion') {
      type = 'ranking_fashion'
    } else if (sub.id !== 'all') {
      type = `ranking_beauty_${sub.name}`
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('product_type', type)
      .order('rank', { ascending: true })
      .limit(10)

    if (!data || data.length === 0) {
      // 데이터가 없고, 뷰티 카테고리이며, 자동 패치 허용 시
      if (cat === 'beauty' && autoFetchIfNeeded) {
        console.log('데이터 없음: 자동 업데이트 시작...')
        // 로딩 상태 유지한 채로 스크래핑 시도
        // handleUpdateRanking 내부에서 fetchProducts를 다시 부를 때 autoFetchIfNeeded=false로 불러야 함
        await handleUpdateRanking(true)
        return // handleUpdateRanking이 마무리하고 재조회까지 함
      }
    }

    setProducts(data || [])
    setLoading(false)
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
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-500 hover:text-red-500 px-2 transition-colors whitespace-nowrap"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* 스마트 견적 요청 섹션 (검색/요청) - 최상단 배치 */}
        <RequestSection ref={requestSectionRef} />

        <hr className="border-slate-100 my-4" />

        {/* 탭 메뉴 (메인 카테고리) */}
        <div className="flex p-1 mx-4 mt-2 mb-2 bg-slate-200/50 rounded-xl">
          {(['beauty', 'fashion'] as Category[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setCategory(tab)
                // 패션 전환 시 서브카테고리 초기화 혹은 유지 (현재는 뷰티만 서브 있음)
                if (tab === 'fashion') setSubCategory(beautySubCategories[0])
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${category === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab === 'beauty' ? t('tab.beauty') : t('tab.fashion')}
            </button>
          ))}
        </div>

        {/* 서브 카테고리 (뷰티일 때만 표시) - 그리드 레이아웃 */}
        {category === 'beauty' && (
          <div className="px-4 mb-6">
            <div className="grid grid-cols-4 gap-2">
              {beautySubCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSubCategory(sub)}
                  className={`px-2 py-2 text-[11px] font-bold rounded-lg border transition-all text-center truncate ${subCategory.id === sub.id
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 랭킹 섹션 */}
        <section className="px-4 mb-8">
          <div className="flex items-baseline justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-800">
              {category === 'beauty' ? t('ranking.title.beauty') : t('ranking.title.fashion')}
            </h2>
            <span className="text-xs text-slate-400 font-medium">{t('ranking.top10')}</span>
          </div>

          {loading || isScraping ? (
            <div className="flex gap-3 overflow-x-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-32 flex-shrink-0 aspect-[3/4] bg-slate-200 rounded-xl animate-pulse flex items-center justify-center">
                  {i === 1 && isScraping && <span className="text-xs text-slate-500 font-bold animate-bounce">최신 랭킹 확인 중...</span>}
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-400 text-sm">
                {category === 'fashion' ? t('ranking.fashion.empty') : t('ranking.empty')}
              </p>
              {category === 'beauty' && (
                <button
                  onClick={() => handleUpdateRanking(false)}
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

        {/* 실시간 활동 내역 (더미 데이터) */}
        <RecentActivity />

      </div>

      {/* 관리자용 업데이트 버튼 */}
      {category === 'beauty' && (
        <button
          onClick={() => handleUpdateRanking(false)}
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
