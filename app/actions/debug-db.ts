
'use server'
import { createClient } from '@/app/lib/supabase/server'

export async function checkDBStatus() {
    try {
        const supabase = createClient()

        // 1. Check Auth (Optional)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        // 2. Check request_items column
        // Try to select the 'is_hidden_by_user' column specifically to see if it exists
        const { error: selectError } = await supabase
            .from('request_items')
            .select('id, is_hidden_by_user')
            .limit(1)

        // 3. Check simple insert
        // We won't actually insert, but we can try to select from requests
        const { error: requestsError } = await supabase
            .from('requests')
            .select('id')
            .limit(1)

        return {
            success: true,
            auth: user ? 'Logged In' : 'Anon',
            selectColumnError: selectError ? selectError.message : 'Column seems generic or exists (no error means column exists or * selected)',
            requestsAccess: requestsError ? requestsError.message : 'OK'
        }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
