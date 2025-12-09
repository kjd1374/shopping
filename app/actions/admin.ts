'use server'

import { createClient } from '@/app/lib/supabase/server'

// 요청 목록 조회
export async function getRequests() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('requests')
      .select(`
        id,
        user_id,
        status,
        created_at,
        request_items (
          id,
          og_title,
          og_image,
          item_status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 첫 번째 아이템의 제목을 대표 상품명으로 사용
    const requestsWithTitle = data?.map(request => ({
      ...request,
      representative_title: (request.request_items as any[])?.[0]?.og_title || '상품 없음',
    })) || []

    return { success: true, data: requestsWithTitle }
  } catch (error: any) {
    console.error('Get requests error:', error)
    return { success: false, error: error.message || 'Failed to fetch requests' }
  }
}

// 특정 요청의 상세 정보 조회
export async function getRequestDetails(requestId: string) {
  try {
    const supabase = createClient()
    // 요청 정보
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError) throw requestError

    // 요청 아이템들 (모든 필드 포함)
    const { data: itemsData, error: itemsError } = await supabase
      .from('request_items')
      .select('id, request_id, original_url, og_image, og_title, admin_price, admin_capacity, admin_color, admin_etc, admin_rerequest_note, user_selected_options, user_quantity, created_at, item_status, user_response')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    return {
      success: true,
      request: requestData,
      items: itemsData || [],
    }
  } catch (error: any) {
    console.error('Get request details error:', error)
    return { success: false, error: error.message || 'Failed to fetch request details' }
  }
}

// 개별 아이템 수정
export async function updateRequestItem(
  itemId: string,
  price: number | null,
  capacity: string | null,
  color: string | null,
  etc: string | null,
  rerequestNote: string | null,
  itemStatus: string = 'pending'
) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('request_items')
      .update({
        admin_price: price,
        admin_capacity: capacity,
        admin_color: color,
        admin_etc: etc,
        admin_rerequest_note: rerequestNote,
        item_status: itemStatus,
      })
      .eq('id', itemId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Update item error:', error)
    return { success: false, error: error.message || 'Failed to update item' }
  }
}

// 요청 승인 (상태를 reviewed로 변경)
export async function confirmRequest(requestId: string) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('requests')
      .update({ status: 'reviewed' })
      .eq('id', requestId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Confirm request error:', error)
    return { success: false, error: error.message || 'Failed to confirm request' }
  }
}

// 요청 상태 변경
export async function updateRequestStatus(requestId: string, status: 'pending' | 'reviewed' | 'ordered') {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('requests')
      .update({ status })
      .eq('id', requestId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Update status error:', error)
    return { success: false, error: error.message || 'Failed to update status' }
  }
}

// 배송 배치 목록 조회
export async function getShipmentBatches() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shipment_batches')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Get batches error:', error)
    return { success: false, error: error.message }
  }
}

// 배송 배치 생성
export async function createShipmentBatch(name: string, trackingNo: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shipment_batches')
      .insert({
        batch_name: name,
        tracking_no: trackingNo,
        status: 'shipped'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Create batch error:', error)
    return { success: false, error: error.message }
  }
}

// 요청을 배치에 할당
export async function assignRequestsToBatch(batchId: string, requestIds: string[]) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('requests')
      .update({
        batch_id: batchId,
        status: 'ordered'
      })
      .in('id', requestIds)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Assign batch error:', error)
    return { success: false, error: error.message }
  }
}

// 사용자 목록 조회
export async function getUsers() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('Get users error:', error)
    return { success: false, error: error.message }
  }
}

// 사용자 권한 변경
export async function updateUserRole(userId: string, newRole: 'user' | 'partner' | 'admin') {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Update role error:', error)
    return { success: false, error: error.message }
  }
}
// 요청 삭제 (여러 개)
export async function deleteRequests(requestIds: string[]) {
  try {
    const supabase = createClient()

    // 1. 관련된 아이템 먼저 삭제 (Cascade 설정이 없다고 가정하고 안전하게)
    const { error: itemsError } = await supabase
      .from('request_items')
      .delete()
      .in('request_id', requestIds)

    if (itemsError) throw itemsError

    // 2. 요청 삭제
    const { error: requestsError } = await supabase
      .from('requests')
      .delete()
      .in('id', requestIds)

    if (requestsError) throw requestsError

    return { success: true }
  } catch (error: any) {
    console.error('Delete requests error:', error)
    return { success: false, error: error.message }
  }
}
