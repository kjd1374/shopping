'use client'

import { useState } from 'react'
import { getUrlPreview, type PreviewResult } from '../actions/preview-url'
import { submitProductRequest } from '../actions/submit-request'

export default function RequestPage() {
  const [inputUrl, setInputUrl] = useState('')
  const [items, setItems] = useState<PreviewResult[]>([])
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // 이미지 슬라이더 상태 관리 (아이템 인덱스 -> 현재 이미지 인덱스)
  const [imageIndices, setImageIndices] = useState<Record<number, number>>({})

  // URL 추가 핸들러
  const handleAddUrl = async () => {
    if (!inputUrl.trim()) return
    if (items.length >= 5) {
      alert('최대 5개까지만 요청할 수 있어요.')
      return
    }
    if (!/^https?:\/\//i.test(inputUrl)) {
      alert('올바른 URL을 입력해주세요 (https://...)')
      return
    }

    if (items.some(item => item.url === inputUrl)) {
      alert('이미 목록에 있는 URL입니다.')
      return
    }

    setLoading(true)
    try {
      const preview = await getUrlPreview(inputUrl)
      setItems(prev => [...prev, preview])
      setInputUrl('') 
    } catch (error) {
      alert('정보를 가져오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 삭제 핸들러
  const handleRemove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
    setImageIndices(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  // 이미지 넘기기
  const nextImage = (itemIndex: number, max: number) => {
    setImageIndices(prev => ({
      ...prev,
      [itemIndex]: ((prev[itemIndex] || 0) + 1) % max
    }))
  }

  const prevImage = (itemIndex: number, max: number) => {
    setImageIndices(prev => ({
      ...prev,
      [itemIndex]: ((prev[itemIndex] || 0) - 1 + max) % max
    }))
  }

  // 견적 요청 제출 핸들러
  const handleSubmit = async () => {
    if (items.length === 0) return
    
    setSubmitLoading(true)
    try {
      const result = await submitProductRequest(
        items.map(item => ({
          url: item.url,
          title: item.title,
          image: item.images[0] || '' // 대표 이미지(첫번째)만 저장
        }))
      )

      if (result.success) {
        setIsCompleted(true)
      } else {
        alert(result.error || '요청 실패')
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 animate-fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-6 border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">요청이 접수되었습니다!</h2>
          <p className="text-slate-500 leading-relaxed">
            Vina-K 팀이 확인 후 24시간 내에<br/>
            정확한 가격과 배송비를 알려드릴게요.
          </p>
          <button 
            onClick={() => {
              setItems([])
              setIsCompleted(false)
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
          >
            다른 상품 더 요청하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">🇻🇳 Vina-K 견적 요청</h1>
          <span className="text-sm font-medium text-slate-500">{items.length}/5</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* URL 입력 섹션 */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            어떤 상품을 사고 싶으신가요?
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="상품 URL을 붙여넣어주세요 (쿠팡, 무신사 등)"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              disabled={loading}
            />
            <button
              onClick={handleAddUrl}
              disabled={loading || !inputUrl.trim()}
              className="bg-indigo-600 text-white px-5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                '추가'
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 ml-1">
            💡 G마켓, 11번가, 무신사 등 모든 한국 쇼핑몰 URL 지원
          </p>
        </section>

        {/* 상품 리스트 섹션 */}
        {items.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
              요청 목록 ({items.length})
            </h2>
            
            {items.map((item, idx) => {
              const currentImgIdx = imageIndices[idx] || 0
              const hasMultipleImages = item.images.length > 1
              
              return (
                <div 
                  key={idx} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 animate-fade-in relative group"
                >
                  {/* 썸네일 슬라이더 */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 group/image">
                    {item.images.length > 0 ? (
                      <>
                        <img 
                          src={item.images[currentImgIdx]} 
                          alt="썸네일" 
                          className="w-full h-full object-cover" 
                        />
                        {hasMultipleImages && (
                          <>
                            {/* 좌우 화살표 (호버시 표시) */}
                            <div className="absolute inset-0 flex justify-between items-center px-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevImage(idx, item.images.length) }}
                                className="bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transform active:scale-90 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextImage(idx, item.images.length) }}
                                className="bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transform active:scale-90 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                            {/* 인디케이터 */}
                            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                              {item.images.slice(0, 5).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1 h-1 rounded-full transition-colors ${i === currentImgIdx ? 'bg-white shadow-sm' : 'bg-white/40'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                        No Img
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                    <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 mb-2 text-base">
                      {item.title || '제목 없음'}
                    </h3>
                    {/* URL 텍스트 제거됨 */}
                    
                    {item.error ? (
                      <p className="text-xs text-red-500 font-medium bg-red-50 inline-block px-2 py-1 rounded-lg self-start">
                        ⚠️ {item.error}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                         {hasMultipleImages && (
                           <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium">
                             이미지 {item.images.length}장
                           </span>
                         )}
                      </div>
                    )}
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleRemove(idx)}
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </section>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20 safe-area-pb">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={items.length === 0 || submitLoading}
            className="w-full bg-slate-900 text-white text-lg font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitLoading ? '전송 중...' : `${items.length}개 상품 견적 요청하기`}
          </button>
        </div>
      </div>
    </main>
  )
}
