'use server'

import { createClient } from '@/app/lib/supabase/server'

interface ManualOrderData {
    requestId: string
    shippingAddress: {
        name: string
        phone: string
        address: string
        zipcode: string
    }
    depositAmount: number
    finalAmount: number
}

// 수동 이체 주문 제출 (70% 선금 입금 확인 요청)
export async function submitManualOrder({
    requestId,
    shippingAddress,
    depositAmount,
    finalAmount
}: ManualOrderData) {
    try {
        const supabase = createClient()

        // 1. 요청 상태 업데이트 및 배송지 저장
        const { error: updateError } = await supabase
            .from('requests')
            .update({
                status: 'ordered', // 일단 ordered로 변경하여 My Page에서 구분
                payment_status: 'deposit_pending', // 입금 대기중
                shipping_address: shippingAddress,
                deposit_amount: depositAmount,
                final_amount: finalAmount
            })
            .eq('id', requestId)

        if (updateError) throw updateError

        // 2. (Optional) 알림 시스템이 있다면 관리자에게 알림 전송

        return { success: true }

    } catch (error: any) {
        console.error('Manual order submission failed:', error)
        return { success: false, error: error.message }
    }
}

// 2. 관리자용: 입금 확인 처리
export async function confirmDeposit(requestId: string) {
    try {
        const supabase = createClient()
        // 관리자 권한 체크 로직은 RLS나 미들웨어에서 처리된다고 가정, 혹은 여기서 체크 가능

        const { error } = await supabase
            .from('requests')
            .update({ payment_status: 'deposit_paid' })
            .eq('id', requestId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
