
import { createClient } from '@supabase/supabase-js'
import { crawlOliveYoungRanking } from '../app/lib/scraper'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CATEGORIES = [
    '전체',
    '스킨케어',
    '마스크팩',
    '클렌징',
    '더모 코스메틱',
    '헤어케어',
    '바디케어',
    '선케어',
    '메이크업'
]

async function main() {
    console.log('🕒 Daily Ranking Update Started...')

    for (const category of CATEGORIES) {
        try {
            console.log(`Processing: ${category}`)
            const result = await crawlOliveYoungRanking(category)

            if (result.success && result.data && result.data.length > 0) {
                const { data: products, productType } = result

                // Remove old data
                await supabase.from('products').delete().eq('product_type', productType!)

                // Insert new data
                const { error } = await supabase.from('products').insert(products)

                if (error) {
                    console.error(`Failed to save ${category}:`, error.message)
                } else {
                    console.log(`✅ Saved ${products.length} items for ${category}`)
                }
            } else {
                console.warn(`⚠️ No items found for ${category}`)
            }

            // Wait a bit between requests to avoid ban
            await new Promise(r => setTimeout(r, 2000))

        } catch (e) {
            console.error(`Error processing ${category}:`, e)
        }
    }

    console.log('✨ All categories processed.')
    process.exit(0)
}

main()
