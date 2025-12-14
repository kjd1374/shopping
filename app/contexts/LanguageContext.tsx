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
    'ranking.loading': '최신 랭킹 확인 중...',
    'ranking.fetch': '데이터 가져오기',

    // 패션 서브카테고리
    'fashion.all': '전체',
    'fashion.top': '상의',
    'fashion.outer': '아우터',
    'fashion.pants': '바지',
    'fashion.onepiece': '원피스/스커트',
    'fashion.bag': '가방',
    'fashion.shoes': '신발',
    'fashion.underwear': '속옷/홈웨어',
    'fashion.beauty': '뷰티',
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

    // My Page
    'mypage.title': '내 요청함',
    'mypage.main': '메인으로',
    'mypage.logout': '로그아웃',
    'mypage.empty': '아직 요청한 상품이 없습니다.',
    'mypage.goRequest': '견적 요청하러 가기',
    'mypage.requestNum': '요청 #',
    'mypage.unitPrice': '단가',
    'mypage.cantBuy': '🚫 구매 불가',
    'mypage.cantBuyDesc': '관리자가 해당 상품을 구매할 수 없다고 표시했습니다.',
    'mypage.adminNote': '⚠️ 관리자 안내',
    'mypage.selectCapacity': '용량 선택',
    'mypage.selectColor': '색상 선택',
    'mypage.selectEtc': '기타 옵션',
    'mypage.quantity': '수량',
    'mypage.estimatedTotal': '총 예상 금액',
    'mypage.requestPurchase': '구매 요청',
    'mypage.purchaseRequested': '구매 요청됨',
    'mypage.total': '합계',
    'mypage.selectOption': '옵션을 선택해주세요.',
    'mypage.requestSuccess': '구매 요청이 완료되었습니다!',
    'mypage.requestFail': '구매 요청 실패',
    'mypage.status.pending': '대기중',
    'mypage.status.reviewed': '승인완료',
    'mypage.status.ordered': '주문접수',
    'mypage.checkout': '결제하기',
    'mypage.section.ongoing': '🚀 진행 중인 주문',
    'mypage.section.history': '📋 견적 요청 내역',
    // Checkout
    'checkout.title': '주문서 작성',
    'checkout.orderItems': '주문 상품',
    'checkout.option': '옵션',
    'checkout.quantity': '수량',
    'checkout.totalOrder': '총 주문 금액',
    'checkout.deposit': '선결제 (70%)',
    'checkout.finalPayment': '수령 후 결제 (30%)',
    'checkout.depositInfo': '입금 계좌 안내',
    'checkout.qrStart': 'QR 코드 준비중',
    'checkout.bankName': '은행명',
    'checkout.accountNumber': '계좌번호',
    'checkout.copy': '복사',
    'checkout.holder': '예금주',
    'checkout.notice': '⚠️ 입금자명을 주문자명과 동일하게 해주세요.',
    'checkout.notice2': '입금이 확인되면 준비가 시작됩니다.',
    'checkout.shippingInfo': '배송지 정보',
    'checkout.receiver': '받는 분',
    'checkout.namePlaceholder': '이름을 입력하세요',
    'checkout.contact': '연락처',
    'checkout.contactPlaceholder': '010-0000-0000',
    'checkout.address': '주소',
    'checkout.postcodePlaceholder': '우편번호',
    'checkout.addressSearch': '주소 검색',
    'checkout.addressPlaceholder': '기본 주소',
    'checkout.addressDetailPlaceholder': '상세 주소를 입력하세요',
    'checkout.requestDeposit': '입금 확인 요청하기',
    'checkout.alert.fillAll': '배송지 정보를 모두 입력해주세요.',
    'checkout.alert.confirm': '입금 정보를 확인하셨나요? 주문을 제출합니다.',
    'checkout.alert.success': '주문이 접수되었습니다! 안내된 계좌로 입금해주세요.',
    'checkout.alert.fail': '주문 접수 실패: ',
    'checkout.alert.postcode': '우편번호 검색 기능은 추후 연동 예정입니다. 직접 입력해주세요.',
  },
  vi: {
    // Header
    'header.title': 'Vina-K',
    'header.myRequests': 'Yêu cầu của tôi',

    // Tab
    'tab.beauty': 'Làm đẹp (Beauty)',
    'tab.fashion': 'Thời trang (Fashion)',

    // Ranking
    'ranking.title.beauty': '🔥 BXH Olive Young',
    'ranking.title.fashion': '👗 BXH Musinsa',
    'ranking.top10': 'Top 10',
    'ranking.empty': 'Không có dữ liệu xếp hạng.',
    'ranking.fashion.empty': 'Đang chuẩn bị BXH thời trang.',
    'ranking.loading': 'Đang kiểm tra xếp hạng...',
    'ranking.fetch': 'Lấy dữ liệu',

    // Fashion Subcategories
    'fashion.all': 'Tất cả',
    'fashion.top': 'Áo',
    'fashion.outer': 'Áo khoác',
    'fashion.pants': 'Quần',
    'fashion.onepiece': 'Váy/Đầm',
    'fashion.bag': 'Túi',
    'fashion.shoes': 'Giày',
    'fashion.underwear': 'Đồ lót/Đồ mặc nhà',
    'fashion.beauty': 'Làm đẹp',
    'ranking.button': 'Cái này!',
    'ranking.updateOnlyBeauty': 'Hiện tại chỉ có thể cập nhật danh mục làm đẹp.',
    'ranking.updateConfirm': 'Bạn có muốn cập nhật bảng xếp hạng Olive Young mới nhất không? (Mất khoảng 5-10 giây)',
    'ranking.updateSuccess': 'Cập nhật hoàn tất!',
    'ranking.updateFailed': 'Cập nhật thất bại',
    'ranking.systemError': 'Lỗi hệ thống',
    'ranking.productClick': 'Vui lòng nhập tên sản phẩm hoặc dán URL vào bên dưới.',
    'language.products': 'sản phẩm',

    // Request
    'request.title': '📝 Tìm kiếm mọi thứ',
    'request.photo': 'Ảnh',
    'request.productName': 'Tên SP/Từ khóa (Bắt buộc)',
    'request.url': 'URL (Tùy chọn)',
    'request.add': 'Thêm',
    'request.processing': 'Đang xử lý...',
    'request.submit': 'Gửi yêu cầu báo giá',
    'request.submitting': 'Đang gửi...',
    'request.success': '✅ Đã tiếp nhận yêu cầu!',
    'request.success.desc': 'Chúng tôi sẽ báo giá trong vòng 24 giờ.',
    'request.addMore': 'Thêm yêu cầu',
    'request.max': 'Chỉ có thể yêu cầu tối đa 7 sản phẩm.',
    'request.enterName': 'Vui lòng nhập tên sản phẩm hoặc hình ảnh.',
    'request.duplicate': 'URL này đã có trong danh sách.',
    'request.fetchFailed': 'Không thể lấy thông tin.',
    'request.error': 'Có lỗi xảy ra',
    'request.badge.photo': '📷 Ảnh',
    'request.badge.url': 'URL',
    'request.badge.text': 'Nhập tay',
    'request.preview': 'Xem trước',
    'request.thumbnail': 'Hình nhỏ',

    // My Page
    'mypage.title': 'Yêu cầu của tôi',
    'mypage.main': 'Trang chủ',
    'mypage.logout': 'Đăng xuất',
    'mypage.empty': 'Chưa có sản phẩm nào được yêu cầu.',
    'mypage.goRequest': 'Đi yêu cầu báo giá',
    'mypage.requestNum': 'Yêu cầu #',
    'mypage.unitPrice': 'Đơn giá',
    'mypage.cantBuy': '🚫 Không thể mua',
    'mypage.cantBuyDesc': 'Admin đã đánh dấu sản phẩm này không thể mua.',
    'mypage.adminNote': '⚠️ Ghi chú từ Admin',
    'mypage.selectCapacity': 'Chọn dung tích',
    'mypage.selectColor': 'Chọn màu sắc',
    'mypage.selectEtc': 'Tùy chọn khác',
    'mypage.quantity': 'Số lượng',
    'mypage.estimatedTotal': 'Tổng tiền dự kiến',
    'mypage.requestPurchase': 'Yêu cầu mua hàng',
    'mypage.purchaseRequested': '✅ Đã yêu cầu mua',
    'mypage.total': 'Tổng',
    'mypage.selectOption': 'Vui lòng chọn tùy chọn.',
    'mypage.requestSuccess': 'Đã hoàn tất yêu cầu mua hàng!',
    'mypage.requestFail': 'Yêu cầu mua hàng thất bại',
    'mypage.status.pending': 'Đang chờ',
    'mypage.status.reviewed': 'Đã duyệt',
    'mypage.status.ordered': 'Đã đặt hàng',
    'mypage.checkout': 'Thanh toán',

    // Checkout
    'checkout.title': 'Viết đơn đặt hàng',
    'checkout.orderItems': 'Sản phẩm đặt hàng',
    'checkout.option': 'Tùy chọn',
    'checkout.quantity': 'Số lượng',
    'checkout.totalOrder': 'Tổng tiền đặt hàng',
    'checkout.deposit': 'Thanh toán trước (70%)',
    'checkout.finalPayment': 'Thanh toán sau khi nhận (30%)',
    'checkout.depositInfo': 'Thông tin tài khoản',
    'checkout.qrStart': 'QR code đang chuẩn bị',
    'checkout.bankName': 'Tên ngân hàng',
    'checkout.accountNumber': 'Số tài khoản',
    'checkout.copy': 'Sao chép',
    'checkout.holder': 'Chủ tài khoản',
    'checkout.notice': '⚠️ Vui lòng nhập tên người gửi giống với tên người đặt hàng.',
    'checkout.notice2': 'Việc chuẩn bị sẽ bắt đầu sau khi xác nhận thanh toán.',
    'checkout.shippingInfo': 'Thông tin giao hàng',
    'checkout.receiver': 'Người nhận',
    'checkout.namePlaceholder': 'Nhập tên người nhận',
    'checkout.contact': 'Liên hệ',
    'checkout.contactPlaceholder': '010-0000-0000',
    'checkout.address': 'Địa chỉ',
    'checkout.postcodePlaceholder': 'Mã bưu điện',
    'checkout.addressSearch': 'Tìm địa chỉ',
    'checkout.addressPlaceholder': 'Địa chỉ cơ bản',
    'checkout.addressDetailPlaceholder': 'Nhập địa chỉ chi tiết',
    'checkout.requestDeposit': 'Yêu cầu xác nhận nạp tiền',
    'checkout.alert.fillAll': 'Vui lòng nhập đầy đủ thông tin giao hàng.',
    'checkout.alert.confirm': 'Bạn đã kiểm tra thông tin chuyển khoản chưa? Đơn hàng sẽ được gửi đi.',
    'checkout.alert.success': 'Đơn hàng đã được tiếp nhận! Vui lòng chuyển khoản vào tài khoản được hướng dẫn.',
    'checkout.alert.fail': 'Tiếp nhận đơn hàng thất bại: ',
    'checkout.alert.postcode': 'Tính năng tìm kiếm mã bưu điện sẽ được liên kết sau. Vui lòng nhập trực tiếp.',
  },
}


export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('ko')

  const t = (key: string) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
