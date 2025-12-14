'use server'

import { createClient } from '@/app/lib/supabase/server'
import { crawlMusinsaRanking } from '../lib/scraper-musinsa'

export async function scrapeMusinsaRanking(categoryName?: string) {
    try {
        const result = await crawlMusinsaRanking(categoryName)

        if (!result.success || !result.data || result.data.length === 0) {
            return { success: false, error: result.error || '상품을 하나도 찾지 못했습니다.' }
        }

        const { data: products, productType } = result

        // DB 저장
        const supabase = createClient()

        // 이전 데이터 삭제
        await supabase.from('products').delete().eq('product_type', productType!)

        // 새 데이터 삽입
        const { error: insertError } = await supabase.from('products').insert(products)

        if (insertError) {
            throw new Error(`DB 저장 실패: ${insertError.message}`)
        }

        return { success: true, count: products.length }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Scraping error:', errorMessage)
        return { success: false, error: errorMessage }
    }
}
