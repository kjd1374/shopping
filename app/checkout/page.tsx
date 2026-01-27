'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getRequestDetails } from '../actions/admin'
import { submitManualOrder } from '../actions/payment'
import { createClient } from '../lib/supabase/client'
import LoadingState from '../components/LoadingState'
import { HO_CHI_MINH_CITY, HCMC_DISTRICTS } from '../lib/vn-location-data'
import { calculateShippingFee, generateVietQRUrl } from '../utils/payment'
import { SERVICE_FEE } from '../lib/constants'
import { useLanguage } from '../contexts/LanguageContext'

export default function CheckoutPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <CheckoutContent />
        </Suspense>
    )
}

function CheckoutContent() {
    const { t } = useLanguage()
    const router = useRouter()
    const searchParams = useSearchParams()
    const requestId = searchParams.get('requestId')

    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<any[]>([])
    const [productAmount, setProductAmount] = useState(0)
    const [shippingFee, setShippingFee] = useState(0)
    const [serviceFee, setServiceFee] = useState(0)
    const [totalAmount, setTotalAmount] = useState(0)
    const [qrUrl, setQrUrl] = useState('')

    // 배송지 정보
    const [address, setAddress] = useState({
        name: '',
        phone: '',
        city: HO_CHI_MINH_CITY,
        district: '',
        ward: '',
        street: ''
    })

    useEffect(() => {
        if (!requestId) {
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
            }))

            // 주소 파싱 및 자동 채우기
            if (profile.address) {
                const parts = profile.address.split(',').map((s: string) => s.trim())
                // Expected format: "Street, Ward, District, City"
                if (parts.length >= 4 && parts[parts.length - 1].includes('Hồ Chí Minh')) {
                    setAddress(prev => ({
                        ...prev,
                        city: HO_CHI_MINH_CITY,
                        district: parts[parts.length - 2] || '',
                        ward: parts[parts.length - 3] || '',
                        street: parts.slice(0, parts.length - 3).join(', ')
                    }))
                } else {
                    setAddress(prev => ({
                        ...prev,
                        street: profile.address || ''
                    }))
                }
            }
        }

        if (!requestId) return
        const result = await getRequestDetails(requestId)

        if (result.success) {
            const validityItems = (result.items || []).filter((item: any) => {
                const optionPrice = item.user_selected_options?.priceStr
                    ? parseInt(item.user_selected_options.priceStr)
                    : 0
                const finalPrice = optionPrice > 0 ? optionPrice : (item.admin_price || 0)
                return finalPrice > 0
            })

            setItems(validityItems)

            const productTotal = validityItems.reduce((sum: number, item: any) => {
                const optionPrice = item.user_selected_options?.priceStr
                    ? parseInt(item.user_selected_options.priceStr)
                    : 0
                const price = optionPrice > 0 ? optionPrice : (item.admin_price || 0)
                return sum + price * (item.user_quantity || 1)
            }, 0)

            const totalWeight = validityItems.reduce((sum: number, item: any) => {
                return sum + (item.admin_weight || 0) * (item.user_quantity || 1)
            }, 0)
            const shipping = calculateShippingFee(totalWeight);
            const service = SERVICE_FEE;

            const finalTotal = productTotal + shipping + service;

            setProductAmount(productTotal)
            setShippingFee(shipping)
            setServiceFee(service)
            setTotalAmount(finalTotal)

            const deposit = Math.floor(finalTotal * 0.7);
            const qr = generateVietQRUrl(deposit, `DEPOSIT ${requestId?.slice(0, 8)}`);
            setQrUrl(qr);

        } else {
            alert(t('request.fetchFailed'))
            router.back()
        }
        setLoading(false)
    }

    const handleSubmit = async () => {
        if (!address.name || !address.phone || !address.district || !address.ward || !address.street) {
            alert(t('checkout.alert.fillAll'))
            return
        }

        if (!confirm(t('checkout.alert.confirm'))) return

        const depositAmount = Math.floor(totalAmount * 0.7)
        const finalAmount = totalAmount - depositAmount

        const fullAddress = `${address.street}, ${address.ward}, ${address.district}, ${address.city}`

        try {
            const result = await submitManualOrder({
                requestId: requestId!,
                shippingAddress: {
                    name: address.name,
                    phone: address.phone,
                    address: fullAddress,
                    zipcode: '700000'
                },
                depositAmount,
                finalAmount
            })

            if (result.success) {
                alert(t('checkout.alert.success'))
                router.replace('/mypage')
            } else {
                alert(t('checkout.alert.fail') + result.error)
            }
        } catch (e: any) {
            console.error(e)
            alert(t('checkout.alert.fail') + e.message)
        }
    }

    const depositAmount = Math.floor(totalAmount * 0.7)
    const finalAmount = totalAmount - depositAmount

    if (loading) return <LoadingState />

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-slate-900">{t('checkout.title')}</h1>

                {/* 1. 주문 상품 확인 */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">{t('checkout.orderItems')}</h2>
                    <div className="space-y-4">
                        {items.map((item: any) => (
                            <div key={item.id} className="flex gap-4">
                                {item.og_image && (
                                    <img src={item.og_image} alt={item.og_title} className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
                                )}
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.og_title}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {t('checkout.option')}: {
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
                                        <span className="text-xs text-slate-600">{t('checkout.quantity')}: {item.user_quantity || 1}</span>
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
                        <div className="flex justify-between items-center mb-2 text-sm">
                            <span className="text-slate-600">{t('admin.totalAmount')} ({t('language.products')})</span>
                            <span className="font-medium text-slate-900">{productAmount.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-sm">
                            <span className="text-slate-600">{t('admin.weight')}</span>
                            <span className="font-medium text-slate-900">{shippingFee.toLocaleString()} VND</span>
                        </div>
                        {serviceFee > 0 && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-slate-600">Service Fee</span>
                                <span className="font-medium text-slate-900">{serviceFee.toLocaleString()} VND</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-2 pt-2 border-t border-dashed border-slate-200">
                            <span className="text-slate-800 font-bold">{t('checkout.totalOrder')}</span>
                            <span className="text-lg font-bold text-slate-900">{totalAmount.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-indigo-600 bg-indigo-50 p-3 rounded-lg mt-3">
                            <span className="font-bold">{t('checkout.deposit')}</span>
                            <span className="text-xl font-black">{depositAmount.toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400 text-sm px-3">
                            <span>{t('checkout.finalPayment')}</span>
                            <span>{finalAmount.toLocaleString()} VND</span>
                        </div>
                    </div>
                </section>

                {/* 2. 입금 정보 (QR Code) */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>
                    <h2 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2 relative z-10">{t('checkout.depositInfo')}</h2>

                    <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                        <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden">
                            {/* Dynamic VietQR */}
                            {qrUrl ? (
                                <img src={qrUrl} alt="VietQR Payment" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center">
                                    <span className="text-xs text-slate-400 block">{t('checkout.qrStart')}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 font-bold">{t('checkout.bankName')}</p>
                                <p className="text-lg font-bold text-slate-800">VietComBank</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold">{t('checkout.accountNumber')}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-black text-indigo-600 tracking-wider">1234-5678-9012</p>
                                    <button className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200">{t('checkout.copy')}</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold">{t('checkout.holder')}</p>
                                <p className="text-base font-medium text-slate-800">KIM MIN SU (Vina-K)</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-2">
                                {t('checkout.notice')}<br />
                                {t('checkout.notice2')}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. 배송지 정보 입력 */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">{t('checkout.shippingInfo')}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('checkout.receiver')}</label>
                            <input
                                type="text"
                                value={address.name}
                                onChange={e => setAddress({ ...address, name: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                                placeholder={t('checkout.namePlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('checkout.contact')}</label>
                            <input
                                type="tel"
                                value={address.phone}
                                onChange={e => setAddress({ ...address, phone: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                                placeholder={t('checkout.contactPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('checkout.address')}</label>

                            {/* City - Fixed */}
                            <div className="mb-2">
                                <span className="text-xs text-slate-500 font-bold mb-1 block">Tỉnh / Thành phố</span>
                                <input
                                    type="text"
                                    value={address.city}
                                    disabled
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium"
                                />
                            </div>

                            <div className="flex gap-2 mb-2">
                                {/* District */}
                                <div className="flex-1">
                                    <span className="text-xs text-slate-500 font-bold mb-1 block">Quận / Huyện</span>
                                    <select
                                        value={address.district}
                                        onChange={e => setAddress({ ...address, district: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 bg-white"
                                    >
                                        <option value="">{t('mypage.selectOption')}</option>
                                        {HCMC_DISTRICTS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Ward */}
                                <div className="flex-1">
                                    <span className="text-xs text-slate-500 font-bold mb-1 block">Phường / Xã</span>
                                    {/* Ward input as text for now to ensure coverage */}
                                    <input
                                        type="text"
                                        value={address.ward}
                                        onChange={e => setAddress({ ...address, ward: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                                        placeholder="Phường/Xã"
                                    />
                                </div>
                            </div>

                            {/* Street / House No */}
                            <div>
                                <span className="text-xs text-slate-500 font-bold mb-1 block">Số nhà, Tên đường</span>
                                <input
                                    type="text"
                                    value={address.street}
                                    onChange={e => setAddress({ ...address, street: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                                    placeholder={t('checkout.addressDetailPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 결제 버튼 */}
                <button
                    onClick={handleSubmit}
                    className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-lg font-bold rounded-2xl hover:shadow-xl transition-all active:scale-[0.98]"
                >
                    {t('checkout.requestDeposit')} ({depositAmount.toLocaleString()} VND)
                </button>
            </div>
        </main>
    )
}
