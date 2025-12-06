'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/app/lib/supabase/server'

export async function getBatches() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('shipment_batches')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching batches:', error)
        throw new Error('Failed to fetch batches')
    }

    return data
}

export async function getBatchInfo(batchId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('shipment_batches')
        .select('*')
        .eq('id', batchId)
        .single()

    if (error) {
        console.error('Error fetching batch info:', error)
        return null
    }

    return data
}

export async function getBatchDetails(batchId: string) {
    // Fetch requests and their items
    const supabase = createClient()
    const { data, error } = await supabase
        .from('requests')
        .select(`
      *,
      request_items (
        id,
        og_title,
        og_image,
        user_quantity,
        user_selected_option,
        admin_price,
        admin_options
      )
    `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching batch details:', error)
        throw new Error('Failed to fetch batch details')
    }

    return data
}

export async function updateLocalShipping(requestId: string, batchId: string, trackingNo: string) {
    if (!trackingNo) return;

    const supabase = createClient()
    const { error } = await supabase
        .from('requests')
        .update({
            local_tracking_no: trackingNo,
            status: 'shipping_local'
        })
        .eq('id', requestId)

    if (error) {
        console.error('Error updating local shipping:', error)
        throw new Error('Failed to update shipping info')
    }

    revalidatePath(`/partner/batch/${batchId}`)
}
