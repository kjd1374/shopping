'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getRequestDetails } from '../actions/admin'
import { submitManualOrder } from '../actions/payment' // Updated action
import { createClient } from '../lib/supabase/client'
import LoadingState from '../components/LoadingState'

export default function CheckoutPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CheckoutContent />
        </Suspense>
    )
}

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const requestId = searchParams.get('requestId')

    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<any[]>([])
    const [totalAmount, setTotalAmount] = useState(0)

    // 배송지 정보
    const [address, setAddress] = useState({
        name: '',
        phone: '',
        postcode: '',
        address: '',
        detailAddress: ''
    })

    useEffect(() => {
        if (!requestId) {
            // 초기 렌더링 시에는 requestId가 없을 수 있으므로 loading 상태에서 처리하거나
            // Suspense가 해결해줌. 하지만 확실히 하기 위해 체크.
            return
        }
        loadData()
    }, [requestId])

    const loadData = async () => {
        const supabase = createClient()
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (!currentUser) {
            router.push('/login?next=/checkout?requestId=' + requestId)
            return
        }

        // 프로필 정보 가져오기 (주소 자동 입력)
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

        if (profile) {
            setAddress(prev => ({
                ...prev,
                name: profile.full_name || '',
                phone: profile.phone || '',
                address: profile.address || '',
                // 상세 주소나 우편번호는 DB에 없다면 빈값 유지, 만약 address에 포함되어 있다면 분리 로직 필요하나
                // 현재는 전체 주소를 address 필드에 넣는 것으로 처리
            }))
        }

        if (!requestId) return
        const result = await getRequestDetails(requestId)

        if (result.success) {
            // 필터링 및 가격 계산 로직 개선
            const validityItems = (result.items || []).filter((item: any) => {
                // 가격 확인
                // 1. 사용자가 선택한 옵션 가격 (priceStr)
                // 2. 관리자가 설정한 기본 단가 (admin_price)
                const optionPrice = item.user_selected_options?.priceStr
                    ? parseInt(item.user_selected_options.priceStr)
                    : 0

                const finalPrice = optionPrice > 0 ? optionPrice : (item.admin_price || 0)

                // 가격이 0 이상인 경우만 유효 (또는 견적 대기 중인 상품 제외)
                return finalPrice > 0
            })

            setItems(validityItems)

            const total = validityItems.reduce((sum: number, item: any) => {
                const optionPrice = item.user_selected_options?.priceStr
                    ? parseInt(item.user_selected_options.priceStr)
                    : 0
                const price = optionPrice > 0 ? optionPrice : (item.admin_price || 0)

                return sum + price * (item.user_quantity || 1)
            }, 0)

            setTotalAmount(total)
        } else {
            alert('정보를 불러오는데 실패했습니다.')
            router.back()
        }
        setLoading(false)
    }

    const handlePostcode = () => {
        alert('우편번호 검색 기능은 추후 연동 예정입니다. 직접 입력해주세요.')
    }

    const handleSubmit = async () => {
        if (!address.name || !address.phone || !address.address) {
            alert('배송지 정보를 모두 입력해주세요.')
            return
        }

        if (!confirm('입금 정보를 확인하셨나요? 주문을 제출합니다.')) return

        const depositAmount = Math.floor(totalAmount * 0.7)
        const finalAmount = totalAmount - depositAmount

        const result = await submitManualOrder({
            requestId: requestId!,
            shippingAddress: {
                name: address.name,
                phone: address.phone,
                address: address.address + ' ' + address.detailAddress,
                zipcode: address.postcode
            },
            depositAmount, // 70%
            finalAmount   // 30%
        })

        if (result.success) {
            alert('주문이 접수되었습니다! 안내된 계좌로 입금해주세요.')
            router.replace('/mypage')
        } else {
            alert('주문 접수 실패: ' + result.error)
        }
    }

    const depositAmount = Math.floor(totalAmount * 0.7)
    const finalAmount = totalAmount - depositAmount

    if (loading) return <LoadingState />

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-slate-900">주문서 작성</h1>

                {/* 1. 주문 상품 확인 */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">주문 상품</h2>
                    <div className="space-y-4">
                        {items.map((item: any) => (
                            <div key={item.id} className="flex gap-4">
                                {item.og_image && (
                                    <img src={item.og_image} alt={item.og_title} className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
                                )}
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.og_title}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        옵션: {
                                            item.user_selected_options?.optionName
                                                ? item.user_selected_options.optionName
                                                : (
                                                    [
                                                        item.user_selected_options?.color,
                                                        item.user_selected_options?.capacity,
                                                        item.user_selected_options?.etc
                                                    ].filter(Boolean).join(' / ') || '-'
                                                )
                                        }
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-slate-600">수량: {item.user_quantity || 1}개</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {(
                                                (() => {
                                                    const optionPrice = item.user_selected_options?.priceStr
                                                        ? parseInt(item.user_selected_options.priceStr)
                                                        : 0
                                                    const price = optionPrice > 0 ? optionPrice : (item.admin_price || 0)
                                                    return (price * (item.user_quantity || 1)).toLocaleString()
                                                })()
                                            )
                                            } VND
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">총 주문 금액</span>
                            <span className="text-lg font-bold text-slate-900">{totalAmount.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-indigo-600">
                            <span className="font-bold">선결제 (70%)</span>
                            <span className="text-xl font-black">{depositAmount.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400 text-sm">
                            <span>수령 후 결제 (30%)</span>
                            <span>{finalAmount.toLocaleString()} VND</span>
                        </div>
                    </div>
                </section>

                {/* 2. 입금 정보 (QR Code) */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>
                    <h2 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2 relative z-10">입금 계좌 안내</h2>

                    <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                        <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                            {/* Placeholder for QR Code */}
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                <span className="text-xs text-slate-400 block">QR 코드 준비중</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 font-bold">은행명</p>
                                <p className="text-lg font-bold text-slate-800">VietComBank</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold">계좌번호</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-black text-indigo-600 tracking-wider">1234-5678-9012</p>
                                    <button className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200">복사</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold">예금주</p>
                                <p className="text-base font-medium text-slate-800">KIM MIN SU (Vina-K)</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-2">
                                ⚠️ <strong>입금자명</strong>을 <strong>주문자명</strong>과 동일하게 해주세요.<br />
                                입금이 확인되면 준비가 시작됩니다.
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. 배송지 정보 입력 */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">배송지 정보</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">받는 분</label>
                            <input
                                type="text"
                                value={address.name}
                                onChange={e => setAddress({ ...address, name: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                                placeholder="이름을 입력하세요"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">연락처</label>
                            <input
                                type="tel"
                                value={address.phone}
                                onChange={e => setAddress({ ...address, phone: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                                placeholder="010-0000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">주소</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={address.postcode}
                                    onChange={e => setAddress({ ...address, postcode: e.target.value })}
                                    className="w-32 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                                    placeholder="우편번호"
                                />
                                <button
                                    onClick={handlePostcode}
                                    className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                                >
                                    주소 검색
                                </button>
                            </div>
                            <input
                                type="text"
                                value={address.address}
                                onChange={e => setAddress({ ...address, address: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
                                placeholder="기본 주소"
                            />
                            <input
                                type="text"
                                value={address.detailAddress}
                                onChange={e => setAddress({ ...address, detailAddress: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                                placeholder="상세 주소를 입력하세요"
                            />
                        </div>
                    </div>
                </section>

                {/* 결제 버튼 */}
                <button
                    onClick={handleSubmit}
                    className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-lg font-bold rounded-2xl hover:shadow-xl transition-all active:scale-[0.98]"
                >
                    입금 확인 요청하기 (선금 {depositAmount.toLocaleString()} VND)
                </button>
            </div>
        </main>
    )
}
