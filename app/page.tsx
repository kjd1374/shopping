'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import { scrapeOliveYoungRanking } from './actions/scrape-ranking'
import { scrapeMusinsaRanking } from './actions/scrape-musinsa'
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
  { id: 'all', name: 'beauty.all' },
  { id: 'skincare', name: 'beauty.skincare' },
  { id: 'maskpack', name: 'beauty.maskpack' },
  { id: 'cleansing', name: 'beauty.cleansing' },
  { id: 'dermo', name: 'beauty.dermo' },
  { id: 'hair', name: 'beauty.hair' },
  { id: 'body', name: 'beauty.body' },
  { id: 'suncare', name: 'beauty.suncare' },
  { id: 'makeup', name: 'beauty.makeup' },
]

const fashionSubCategories: SubCategory[] = [
  { id: 'all', name: 'fashion.all' },
  { id: 'top', name: 'fashion.top' },
  { id: 'outer', name: 'fashion.outer' },
  { id: 'pants', name: 'fashion.pants' },
  { id: 'onepiece', name: 'fashion.onepiece' },
  { id: 'bag', name: 'fashion.bag' },
  { id: 'shoes', name: 'fashion.shoes' },
  { id: 'underwear', name: 'fashion.underwear' },
  { id: 'beauty', name: 'fashion.beauty' },
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

  // 카테고리나 서브카테고리가 변경되면 데이터를 불러옴
  useEffect(() => {
    fetchProducts(category, subCategory)
  }, [category, subCategory])

  // 랭킹 업데이트 함수 (자동 모드 지원)
  const handleUpdateRanking = async (isAuto = false) => {
    // 뷰티/패션 모두 지원
    // name이 이제 번역 키이므로, 내부 로직용 이름은 별도로 매핑하거나 키를 사용해야 하지만,
    // 기존 스크래퍼는 한글 이름을 사용하고 있음. 
    // 따라서 여기서는 UI 표시용 텍스트만 번역하고, 스크래퍼에는 여전히 한글 이름을 넘겨줘야 함.
    // 하지만 fashionSubCategories의 name이 이제 키값으로 변경되었음 ('fashion.top').
    // 그러므로 키값을 다시 한글로 변환해서 넘겨주거나, 스크래퍼가 영문 ID를 받도록 수정해야 함.
    // 간단하게 해결하기 위해 ID를 기반으로 한글 이름을 매핑하는게 안전함.

    // (간단 맵핑 - 기존 로직 유지용)
    const mapIdToKorean: Record<string, string> = {
      'all': '전체',
      'top': '상의',
      'outer': '아우터',
      'pants': '바지',
      'onepiece': '원피스/스커트',
      'bag': '가방',
      'shoes': '신발',
      'underwear': '속옷/홈웨어',
      'beauty': '뷰티',
      'skincare': '스킨케어',
      'maskpack': '마스크팩',
      'cleansing': '클렌징',
      'dermo': '더모 코스메틱',
      'hair': '헤어케어',
      'body': '바디케어',
      'suncare': '선케어',
      'makeup': '메이크업'
    }

    const targetName = mapIdToKorean[subCategory.id] || subCategory.name
    // const targetName = subCategory.id === 'all' ? '전체' : subCategory.name // (Old)

    if (!isAuto && !confirm(`'${targetName}' ${t('ranking.updateConfirm')}`)) return

    setIsScraping(true)
    try {
      let result;

      if (category === 'beauty') {
        result = await scrapeOliveYoungRanking(targetName)
      } else {
        result = await scrapeMusinsaRanking(targetName)
      }

      if (result.success) {
        if (!isAuto) alert(`${t('ranking.updateSuccess')} (${result.count} ${t('language.products')})`)
        fetchProducts(category, subCategory, false)
      } else {
        if (!isAuto) alert(`${t('ranking.updateFailed')}: ${result.error}`)
        setLoading(false)
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

    // 매핑 (fetch 시 한글 DB 타입 매칭 필요)
    const mapIdToKoreanForType: Record<string, string> = {
      'all': '전체', 'top': '상의', 'outer': '아우터', 'pants': '바지',
      'onepiece': '원피스/스커트', 'bag': '가방', 'shoes': '신발',
      'underwear': '속옷/홈웨어', 'beauty': '뷰티',
      'skincare': '스킨케어', 'maskpack': '마스크팩', 'cleansing': '클렌징',
      'dermo': '더모 코스메틱', 'hair': '헤어케어', 'body': '바디케어',
      'suncare': '선케어', 'makeup': '메이크업'
    }

    let type = 'ranking_beauty'
    if (cat === 'fashion') {
      const korName = mapIdToKoreanForType[sub.id] || sub.name
      type = sub.id === 'all' ? 'ranking_fashion' : `ranking_fashion_${korName}`
    } else if (sub.id !== 'all') {
      const korName = mapIdToKoreanForType[sub.id] || sub.name
      type = `ranking_beauty_${korName}`
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('product_type', type)
      .order('rank', { ascending: true })
      .limit(10)

    if (!data || data.length === 0) {
      // 데이터가 없고, 자동 패치 허용 시 (뷰티/패션 모두 적용)
      if (autoFetchIfNeeded) {
        console.log('데이터 없음: 자동 업데이트 시작...')
        await handleUpdateRanking(true)
        return
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
      <header className="bg-white sticky top-0 z-20 border-b border-slate-100 px-4 h-12 flex items-center justify-between shadow-sm">
        <h1 className="text-base font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-600">
          {t('header.title')}
        </h1>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={() => router.push('/mypage')}
              className="text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full shadow-md active:scale-95 transition-transform"
            >
              {t('header.myRequests')}
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-full shadow-md active:scale-95 transition-transform"
            >
              로그인
            </button>
          )}
          <LanguageSwitcher />
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="text-[10px] font-bold text-slate-500 hover:text-red-500 px-1.5 transition-colors whitespace-nowrap"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* 스마트 견적 요청 섹션 (검색/요청) - 최상단 배치 */}
        <RequestSection ref={requestSectionRef} />

        <hr className="border-slate-100 my-2" />

        {/* 탭 메뉴 (메인 카테고리) */}
        <div className="flex p-0.5 mx-4 mt-1 mb-1 bg-slate-200/50 rounded-lg">
          {(['beauty', 'fashion'] as Category[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setCategory(tab)
                // 패션/뷰티 모두 첫번째 탭으로 초기화 (원한다면)
                if (tab === 'fashion') setSubCategory(fashionSubCategories[0])
                if (tab === 'beauty') setSubCategory(beautySubCategories[0])
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${category === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {tab === 'beauty' ? t('tab.beauty') : t('tab.fashion')}
            </button>
          ))}
        </div>

        {/* 서브 카테고리 (그리드 레이아웃) */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-4 gap-1">
            {(category === 'beauty' ? beautySubCategories : fashionSubCategories).map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubCategory(sub)}
                className={`px-1 py-1.5 text-[10px] font-bold rounded-md border transition-all text-center truncate ${subCategory.id === sub.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {t(sub.name)}
              </button>
            ))}
          </div>
        </div>

        {/* 랭킹 섹션 */}
        <section className="px-4 mb-4">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-sm font-bold text-slate-800">
              {category === 'beauty' ? t('ranking.title.beauty') : t('ranking.title.fashion')}
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">{t('ranking.top10')}</span>
          </div>

          {loading || isScraping ? (
            <div className="flex gap-2 overflow-x-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-28 flex-shrink-0 aspect-[3/4] bg-slate-200 rounded-lg animate-pulse flex items-center justify-center">
                  {i === 1 && isScraping && <span className="text-[10px] text-slate-500 font-bold animate-bounce">{t('ranking.loading')}</span>}
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-xl border border-slate-100 border-dashed">
              <p className="text-slate-400 text-xs">
                {category === 'fashion' ? t('ranking.fashion.empty') : t('ranking.empty')}
              </p>
              {/* 데이터 없음 - 자동 패치 중이면 안 보일 수 있으나... */}
              <button
                onClick={() => handleUpdateRanking(false)}
                className="mt-2 text-[10px] text-blue-500 underline font-bold"
              >
                {t('ranking.fetch')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group relative w-28 flex-shrink-0 snap-start flex flex-col"
                >
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm border border-slate-100 mb-1.5">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center bg-black/80 text-white font-bold text-xs rounded-br-lg backdrop-blur-sm">
                      {product.rank}
                    </div>
                  </div>

                  <div className="px-0.5">
                    <p className="text-[10px] text-slate-500 font-bold mb-0.5 truncate">
                      {product.brand}
                    </p>
                    <h3 className="text-[11px] font-medium text-slate-900 line-clamp-2 h-7 leading-tight mb-1.5">
                      {product.title}
                    </h3>

                    <button
                      onClick={() => handleRequest(product)}
                      className="w-full py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
                    >
                      {t('ranking.button')}
                    </button>
                    <a
                      href={product.origin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-1 mt-1 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold rounded-md hover:bg-slate-100 transition-all no-underline"
                    >
                      {t('ranking.viewDetails')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="border-slate-100 my-4" />

        {/* 실시간 활동 내역 (더미 데이터) */}
        <RecentActivity />

      </div>

      {/* 관리자용 업데이트 버튼 (모든 카테고리에서 표시) */}
      <button
        onClick={() => handleUpdateRanking(false)}
        disabled={isScraping}
        className={`fixed bottom-4 right-4 bg-slate-800 text-white p-2.5 rounded-full shadow-lg z-50 transition-all active:scale-90 ${isScraping ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
        title="랭킹 업데이트"
      >
        {isScraping ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        )}
      </button>
    </main>
  )
}
