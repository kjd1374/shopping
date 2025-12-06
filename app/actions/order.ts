'use server'

import { createClient } from '../lib/supabase/server'

// 주문 확정 (옵션 선택 및 수량 저장, 상태를 ordered로 변경)
export async function confirmOrder(
  itemId: string,
  selectedOptions: Record<string, string>,
  quantity: number
) {
  try {
    const supabase = createClient()
    
    // 아이템 업데이트
    const { error: itemError } = await supabase
      .from('request_items')
      .update({
        user_selected_options: selectedOptions,
        user_quantity: quantity,
      })
      .eq('id', itemId)

    if (itemError) throw itemError

    // 해당 요청의 모든 아이템이 주문 완료되었는지 확인
    const { data: requestItem, error: fetchError } = await supabase
      .from('request_items')
      .select('request_id')
      .eq('id', itemId)
      .single()

    if (fetchError) throw fetchError

    // 같은 요청의 모든 아이템 조회
    const { data: allItems, error: itemsError } = await supabase
      .from('request_items')
      .select('id, user_selected_options')
      .eq('request_id', requestItem.request_id)

    if (itemsError) throw itemsError

    // 모든 아이템이 옵션을 선택했는지 확인 (간단히 user_selected_options가 있는지 확인)
    const allOrdered = allItems?.every(item => item.user_selected_options !== null) || false

    // 모든 아이템이 주문 완료되면 요청 상태도 ordered로 변경
    if (allOrdered) {
      const { error: requestError } = await supabase
        .from('requests')
        .update({ status: 'ordered' })
        .eq('id', requestItem.request_id)

      if (requestError) throw requestError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Confirm order error:', error)
    return { success: false, error: error.message || 'Failed to confirm order' }
  }
}

