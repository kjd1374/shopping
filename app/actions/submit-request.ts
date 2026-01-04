'use server'

import { createClient } from '@/app/lib/supabase/server'
import { sendAdminNotification } from '../lib/notifications'

export interface RequestItem {
  url: string
  title: string
  image: string
}

export async function submitProductRequest(items: RequestItem[]) {
  if (!items || items.length === 0) {
    return { success: false, error: 'No items to request' }
  }

  try {
    const supabase = createClient()

    // 현재 로그인된 사용자 정보 가져오기
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Get user error:', userError)
      return { success: false, error: 'Authentication required. Please log in.' }
    }

    // 1. 요청서(requests) 생성
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .insert([{ status: 'pending', user_id: user?.id || null }])
      .select()
      .single()

    if (requestError) {
      console.error('Request insert error:', requestError)
      throw new Error(`Request creation failed: ${requestError.message || requestError.code || 'Unknown error'}`)
    }

    if (!requestData || !requestData.id) {
      throw new Error('Failed to get request ID')
    }

    const requestId = requestData.id

    // 2. 개별 상품(request_items) 저장
    // 주의: og_image에는 첫 번째 이미지만 저장됨
    const insertData = items.map(item => ({
      request_id: requestId,
      original_url: item.url || '',
      og_title: item.title || '제목 없음',
      og_image: item.image || null, // 대표 이미지 (null 허용)
      user_quantity: 1
    }))

    const { error: itemsError } = await supabase
      .from('request_items')
      .insert(insertData)

    if (itemsError) {
      console.error('Items insert error:', itemsError)
      throw new Error(`Item save failed: ${itemsError.message || itemsError.code || 'Unknown error'}`)
    }

    // 3. 관리자에게 알림 전송 (이메일)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await sendAdminNotification({
        type: 'NEW_REQUEST',
        data: {
          user_email: user?.email,
          title: items[0]?.title,
          quantity: items.length,
          url: items[0]?.url
        }
      })
    } catch (e) {
      console.error('Notification failed:', e)
    }

    return { success: true, requestId }

  } catch (error) {
    const err = error as any
    console.error('Submit error details:', {
      error: err,
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      itemsCount: items.length,
      sampleItem: items[0] ? {
        url: items[0].url?.substring(0, 50),
        title: items[0].title?.substring(0, 50),
        hasImage: !!items[0].image
      } : null
    })
    const errorMessage = err?.message || err?.code || err?.toString() || 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}
