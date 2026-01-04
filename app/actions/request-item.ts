'use server'

import { createClient } from '@/app/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteRequestItem(itemId: string) {
    try {
        const supabase = createClient()
        const { error } = await supabase
            .from('request_items')
            .delete()
            .eq('id', itemId)

        if (error) throw error

        revalidatePath('/mypage')
        return { success: true }
    } catch (error: any) {
        console.error('Delete item error:', error)
        return { success: false, error: error.message }
    }
}

export async function submitUserResponse(itemId: string, response: string) {
    try {
        const supabase = createClient()
        const { error } = await supabase
            .from('request_items')
            .update({
                user_response: response,
                item_status: 'pending' // 다시 승인 대기 상태로 변경
            })
            .eq('id', itemId)

        if (error) throw error

        revalidatePath('/mypage')
        return { success: true }
    } catch (error: any) {
        console.error('Submit response error:', error)
        return { success: false, error: error.message }
    }
}
