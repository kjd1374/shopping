'use client'

import { useState, useRef, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react'
import { getUrlPreview, type PreviewResult } from '../actions/preview-url'
import { submitProductRequest } from '../actions/submit-request'
import { useLanguage } from '../contexts/LanguageContext'
import { createClient } from '../lib/supabase/client'

// 확장된 아이템 타입 (파일 객체 포함)
interface ExtendedItem extends PreviewResult {
  file?: File // 업로드된 이미지 파일
  previewUrl?: string // createObjectURL로 생성한 미리보기 URL
}

export interface RequestSectionRef {
  addProduct: (product: { title: string; image: string; url: string }) => boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RequestSectionProps { }

const RequestSection = forwardRef<RequestSectionRef, RequestSectionProps>((props, ref) => {
  const { t } = useLanguage()
  const [productName, setProductName] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<ExtendedItem[]>([])
  const itemsRef = useRef<ExtendedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  // items 변경 시 ref도 업데이트
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImage(file)
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)
    }
  }

  // 이미지 제거
  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setUploadedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 외부에서 상품 추가하는 함수 (랭킹에서 클릭 시 사용)
  const addProduct = useCallback((product: { title: string; image: string; url: string }) => {
    const currentItems = itemsRef.current

    if (currentItems.length >= 7) {
      alert(t('request.max'))
      return false
    }

    // 중복 체크
    if (currentItems.some(item => item.url === product.url && product.url)) {
      alert(t('request.duplicate'))
      return false
    }

    const newItem: ExtendedItem = {
      url: product.url,
      title: product.title,
      images: product.image ? [product.image] : [],
    }
    setItems(prev => [...prev, newItem])
    return true
  }, [t])

  // 부모 컴포넌트에 함수 노출
  useImperativeHandle(ref, () => ({
    addProduct,
  }), [addProduct])

  // 추가 버튼 핸들러 (우선순위: 사진 > URL > 텍스트)
  const handleAdd = async () => {
    if (items.length >= 7) {
      alert(t('request.max'))
      return
    }

    // Priority 1: 사진이 있으면 파일로 추가
    if (uploadedImage && imagePreview) {
      const newItem: ExtendedItem = {
        url: inputUrl || '',
        title: productName.trim() || t('request.badge.photo'),
        images: [imagePreview],
        file: uploadedImage,
        previewUrl: imagePreview,
      }
      setItems(prev => [...prev, newItem])

      // 입력 필드 초기화 (URL revoke 하지 않음 - 리스트 아이템이 사용)
      setProductName('')
      setInputUrl('')
      setUploadedImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Priority 2: URL이 있으면 크롤링 시도
    if (inputUrl.trim()) {
      const isUrl = /^https?:\/\//i.test(inputUrl)

      if (isUrl) {
        if (items.some(item => item.url === inputUrl)) {
          alert(t('request.duplicate'))
          return
        }

        setLoading(true)
        try {
          const preview = await getUrlPreview(inputUrl)
          const newItem: ExtendedItem = {
            ...preview,
            title: productName.trim() || preview.title,
          }
          setItems(prev => [...prev, newItem])
          setProductName('')
          setInputUrl('')
        } catch {
          alert(t('request.fetchFailed'))
        } finally {
          setLoading(false)
        }
        return
      }
    }

    // Priority 3: 텍스트만 있으면 기본 아이템으로 추가
    if (productName.trim()) {
      const newItem: ExtendedItem = {
        url: inputUrl || '',
        title: productName.trim(),
        images: [],
      }
      setItems(prev => [...prev, newItem])
      setProductName('')
      setInputUrl('')
      return
    }

    alert(t('request.enterName'))
  }

  const handleRemove = (index: number) => {
    const item = items[index]
    // 미리보기 URL 정리
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (items.length === 0) return

    setSubmitLoading(true)
    try {
      const supabase = createClient()

      // 이미지 업로드 및 URL 변환
      const processedItems = await Promise.all(items.map(async (item) => {
        let imageUrl = item.images[0] || item.previewUrl || ''

        // 파일이 있는 경우 업로드
        if (item.file) {
          try {
            const fileExt = item.file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('request_images')
              .upload(fileName, item.file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
              .from('request_images')
              .getPublicUrl(fileName)

            imageUrl = publicUrl
          } catch (e) {
            // 썸네일로 교체
            imageUrl = publicUrl
          } catch (e) {
            console.error('Image upload failed:', e)
            // 치명적 에러로 처리하여 알림
            throw new Error(t('request.uploadFailed') || 'Image upload failed')
          }
        }

        return {
          url: item.url || '',
          title: item.title,
          image: imageUrl
        }
      }))

      const result = await submitProductRequest(processedItems)

      if (result.success) {
        // 미리보기 URL 정리
        items.forEach(item => {
          if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl)
          }
        })
        setIsCompleted(true)
        setItems([])
      } else {
        // 구체적인 에러 메시지 표시
        const errorMsg = result.error || t('request.error')
        alert(errorMsg)
        console.error('Submit failed:', result)
      }
    } catch {
      alert(t('request.error'))
    } finally {
      setSubmitLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-100 text-center animate-fade-in">
        <div className="text-green-600 text-xl font-bold mb-2">{t('request.success')}</div>
        <p className="text-green-700 text-sm mb-4">{t('request.success.desc')}</p>
        <button
          onClick={() => setIsCompleted(false)}
          className="text-xs font-bold text-green-800 underline"
        >
          {t('request.addMore')}
        </button>
      </div>
    )
  }

  return (
    <section className="mt-8 px-4 mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-bold text-slate-800">
          {t('request.title')}
        </h2>
        <span className="text-xs text-slate-400 font-medium">{items.length}/7</span>
      </div>

      {/* 2단 입력 폼 */}
      <div className="flex gap-4 mb-6">
        {/* 좌측: 이미지 업로더 */}
        <div className="flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 overflow-hidden"
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt={t('request.preview')}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage()
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-lg z-10"
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span className="text-3xl">📷</span>
                <span className="text-xs font-bold text-slate-600">{t('request.photo')}</span>
              </>
            )}
          </button>
        </div>

        {/* 우측: 텍스트 입력 필드 */}
        <div className="flex-1 flex flex-col gap-3">
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('request.productName')}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
            disabled={loading}
          />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('request.url')}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
            disabled={loading}
          />
          <button
            onClick={handleAdd}
            disabled={loading || (!productName.trim() && !uploadedImage && !inputUrl.trim())}
            className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-colors shadow-md active:scale-95 text-sm"
          >
            {loading ? t('request.processing') : t('request.add')}
          </button>
        </div>
      </div>

      {/* 요청 리스트 */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3 animate-fade-in relative group items-center"
          >
            {/* 썸네일 */}
            <div className="w-16 h-16 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-50">
              {item.images.length > 0 || item.previewUrl ? (
                <img
                  src={item.previewUrl || item.images[0]}
                  alt={t('request.thumbnail')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.file ? 'bg-green-50 text-green-600' :
                  item.url ? 'bg-indigo-50 text-indigo-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>
                  {item.file ? t('request.badge.photo') : item.url ? t('request.badge.url') : t('request.badge.text')}
                </span>
              </div>
              <input
                type="text"
                value={item.title}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[idx].title = e.target.value
                  setItems(newItems)
                }}
                className="w-full text-sm font-medium text-slate-900 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none px-0 py-0.5"
              />
              {item.error && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={() => handleRemove(idx)}
              className="text-slate-300 hover:text-red-500 p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 전송 버튼 */}
      {items.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitLoading}
          className="w-full mt-6 bg-indigo-600 text-white text-lg font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 active:scale-[0.98]"
        >
          {submitLoading ? t('request.submitting') : `${items.length}${t('request.submit')}`}
        </button>
      )}
    </section>
  )
})

RequestSection.displayName = 'RequestSection'

export default RequestSection
