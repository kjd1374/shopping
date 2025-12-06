'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'ko' | 'vi'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 번역 데이터
const translations: Record<Language, Record<string, string>> = {
  ko: {
    // 헤더
    'header.title': 'Vina-K',
    'header.myRequests': '내 요청함',
    
    // 탭
    'tab.beauty': '뷰티 (Beauty)',
    'tab.fashion': '패션 (Fashion)',
    
    // 랭킹
    'ranking.title.beauty': '🔥 올리브영 실시간 랭킹',
    'ranking.title.fashion': '👗 무신사 실시간 랭킹',
    'ranking.top10': 'Top 10',
    'ranking.empty': '랭킹 데이터가 없습니다.',
    'ranking.fashion.empty': '패션 랭킹 준비중입니다.',
    'ranking.fetch': '데이터 가져오기',
    'ranking.button': '이거요!',
    'ranking.updateOnlyBeauty': '현재는 뷰티 카테고리만 업데이트 가능합니다.',
    'ranking.updateConfirm': '올리브영 랭킹을 최신으로 업데이트하시겠습니까? (약 5~10초 소요)',
    'ranking.updateSuccess': '업데이트 완료!',
    'ranking.updateFailed': '업데이트 실패',
    'ranking.systemError': '시스템 에러 발생',
    'ranking.productClick': '아래 입력창에 상품명을 입력하거나 URL을 붙여넣어주세요.',
    'language.products': '개 상품',
    
    // 견적 요청
    'request.title': '📝 무엇이든 찾아드려요',
    'request.photo': '사진',
    'request.productName': '상품명/키워드 (필수)',
    'request.url': 'URL (선택사항)',
    'request.add': '추가',
    'request.processing': '처리 중...',
    'request.submit': '개 견적 요청하기',
    'request.submitting': '전송 중...',
    'request.success': '✅ 요청 접수 완료!',
    'request.success.desc': '24시간 내에 견적을 알려드릴게요.',
    'request.addMore': '추가 요청하기',
    'request.max': '최대 7개까지만 요청할 수 있어요.',
    'request.enterName': '상품명 또는 이미지를 입력해주세요.',
    'request.duplicate': '이미 목록에 있는 URL입니다.',
    'request.fetchFailed': '정보를 가져오는 데 실패했습니다.',
    'request.error': '오류 발생',
    'request.badge.photo': '📷 사진',
    'request.badge.url': 'URL',
    'request.badge.text': '직접입력',
    'request.preview': '미리보기',
    'request.thumbnail': '썸네일',
  },
  vi: {
    // Header
    'header.title': 'Vina-K',
    'header.myRequests': 'Yêu cầu của tôi',
    
    // Tab
    'tab.beauty': 'Làm đẹp (Beauty)',
    'tab.fashion': 'Thời trang (Fashion)',
    
    // Ranking
    'ranking.title.beauty': '🔥 Bảng xếp hạng Olive Young',
    'ranking.title.fashion': '👗 Bảng xếp hạng Musinsa',
    'ranking.top10': 'Top 10',
    'ranking.empty': 'Không có dữ liệu xếp hạng.',
    'ranking.fashion.empty': 'Bảng xếp hạng thời trang đang được chuẩn bị.',
    'ranking.fetch': 'Lấy dữ liệu',
    'ranking.button': 'Cái này!',
    'ranking.updateOnlyBeauty': 'Hiện tại chỉ có thể cập nhật danh mục làm đẹp.',
    'ranking.updateConfirm': 'Bạn có muốn cập nhật bảng xếp hạng Olive Young mới nhất không? (Mất khoảng 5-10 giây)',
    'ranking.updateSuccess': 'Cập nhật hoàn tất!',
    'ranking.updateFailed': 'Cập nhật thất bại',
    'ranking.systemError': 'Đã xảy ra lỗi hệ thống',
    'ranking.productClick': 'Vui lòng nhập tên sản phẩm hoặc dán URL vào ô nhập bên dưới.',
    'language.products': 'sản phẩm',
    
    // Request
    'request.title': '📝 Tìm bất cứ thứ gì cho bạn',
    'request.photo': 'Ảnh',
    'request.productName': 'Tên sản phẩm/Từ khóa (Bắt buộc)',
    'request.url': 'URL (Tùy chọn)',
    'request.add': 'Thêm',
    'request.processing': 'Đang xử lý...',
    'request.submit': 'sản phẩm yêu cầu báo giá',
    'request.submitting': 'Đang gửi...',
    'request.success': '✅ Yêu cầu đã được tiếp nhận!',
    'request.success.desc': 'Chúng tôi sẽ thông báo báo giá trong vòng 24 giờ.',
    'request.addMore': 'Thêm yêu cầu',
    'request.max': 'Chỉ có thể yêu cầu tối đa 7 sản phẩm.',
    'request.enterName': 'Vui lòng nhập tên sản phẩm hoặc hình ảnh.',
    'request.duplicate': 'URL này đã có trong danh sách.',
    'request.fetchFailed': 'Không thể lấy thông tin.',
    'request.error': 'Đã xảy ra lỗi',
    'request.badge.photo': '📷 Ảnh',
    'request.badge.url': 'URL',
    'request.badge.text': 'Nhập trực tiếp',
    'request.preview': 'Xem trước',
    'request.thumbnail': 'Hình thu nhỏ',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi') // 기본값 베트남어

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
