'use server'

import { createClient } from '@supabase/supabase-js'

export async function uploadImage(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            throw new Error('No file uploaded')
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        if (!supabaseUrl) {
            throw new Error('Server configuration error: Missing Supabase URL')
        }

        // Use Service Role Key if available (preferred for bypassing RLS), otherwise fallback to Anon Key
        const supabaseKey = supabaseServiceKey || supabaseAnonKey

        if (!supabaseKey) {
            throw new Error('Server configuration error: Missing Supabase credentials')
        }

        // Create client
        // Note: We prioritize Service Role Key. If missing, we warn in the error case.
        const isUsingServiceKey = !!supabaseServiceKey;
        const supabase = createClient(supabaseUrl, supabaseKey)

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase.storage
            .from('request_images')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Supabase upload error:', uploadError)

            // If we failed AND we were not using the service key, it's likely a permission issue
            if (!isUsingServiceKey && uploadError.message.includes('policy')) {
                return {
                    success: false,
                    error: 'Vercel 설정에 SUPABASE_SERVICE_ROLE_KEY가 누락되었습니다. 환경변수를 확인해주세요.'
                }
            }

            throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
            .from('request_images')
            .getPublicUrl(fileName)

        return { success: true, publicUrl }

    } catch (error: any) {
        console.error('Upload action error:', error)
        return { success: false, error: error.message || 'Upload failed' }
    }
}
