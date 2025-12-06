'use server'

import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import { createClient } from '@/app/lib/supabase/server'

const RANKING_URL = 'https://www.oliveyoung.co.kr/store/main/getBestList.do'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

export async function scrapeOliveYoungRanking() {
  let browser: puppeteer.Browser | null = null

  try {
    console.log('🚀 랭킹 크롤링 시작...')
    
    // Puppeteer 실행 옵션: headless: "new" 사용
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)

    // 리소스 최적화
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      if (['font', 'media'].includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    await page.goto(RANKING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const html = await page.content()
    const $ = cheerio.load(html)

    const products: any[] = []

    // 랭킹 리스트 순회
    $('.cate_prd_list li').each((idx, el) => {
      if (idx >= 10) return 

      const $el = $(el)
      const rank = idx + 1
      const brand = $el.find('.tx_brand').text().trim()
      const title = $el.find('.tx_name').text().trim()
      
      const imgTag = $el.find('img')
      let image = imgTag.attr('data-original') || imgTag.attr('src') || ''
      let originUrl = $el.find('a').attr('href') || ''

      // URL 정규화
      if (originUrl && !originUrl.startsWith('http')) {
         if (originUrl.startsWith('/')) {
             originUrl = `https://www.oliveyoung.co.kr${originUrl}`
         } else if (originUrl.includes('javascript:')) {
             const match = originUrl.match(/'([^']+)'/)
             if (match) {
                 originUrl = `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${match[1]}`
             }
         }
      }

      // 이미지 URL 정규화
      if (image && !image.startsWith('http')) {
        if (image.startsWith('//')) {
            image = `https:${image}`
        }
      }

      if (title && image) {
        products.push({
          rank,
          title,
          brand,
          image,
          origin_url: originUrl,
          product_type: 'ranking_beauty',
          updated_at: new Date().toISOString(),
        })
      }
    })

    console.log(`✨ ${products.length}개 상품 추출 완료.`)

    if (products.length === 0) {
      return { success: false, error: '상품을 하나도 찾지 못했습니다.' }
    }

    // DB 저장 (Upsert 사용)
    const supabase = createClient()
    // onConflict 컬럼이 테이블에 Unique 제약 조건이 걸려있어야 함 (origin_url)
    const { error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'origin_url' })

    if (error) {
      // upsert 실패 시 기존 방식 시도 (삭제 후 삽입)
      console.warn('Upsert 실패, 삭제 후 삽입 시도:', error.message)
      
      await supabase.from('products').delete().eq('product_type', 'ranking_beauty')
      const { error: insertError } = await supabase.from('products').insert(products)
      
      if (insertError) {
        throw new Error(`DB 저장 실패: ${insertError.message}`)
      }
    }

    return { success: true, count: products.length }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Scraping error:', errorMessage)
    return { success: false, error: errorMessage }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
