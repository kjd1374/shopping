'use server'

import * as cheerio from 'cheerio'
import { createClient } from '@/app/lib/supabase/server'
import { Browser } from 'puppeteer-core'
import { getBrowser } from '../lib/puppeteer'

const RANKING_URL = 'https://www.oliveyoung.co.kr/store/main/getBestList.do'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

export async function scrapeOliveYoungRanking(categoryName?: string) {
  let browser: Browser | null = null

  try {
    console.log(`🚀 랭킹 크롤링 시작... (카테고리: ${categoryName || '전체'})`)

    // Puppeteer 실행
    browser = await getBrowser()

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

    // 카테고리별 URL 매핑
    const CATEGORY_URLS: Record<string, string> = {
      '전체': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EC%A0%84%EC%B2%B4',
      '스킨케어': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010001&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EC%8A%A4%ED%82%A8%EC%BC%80%EC%96%B4',
      '마스크팩': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010009&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EB%A7%88%EC%8A%A4%ED%81%AC%ED%8C%A9',
      '클렌징': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010010&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%ED%81%B4%EB%A0%8C%EC%A7%95',
      '더모 코스메틱': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010008&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EB%8D%94%EB%AA%A8+%EC%BD%94%EC%8A%A4%EB%A9%94%ED%8B%B1',
      '헤어케어': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010004&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%ED%97%A4%EC%96%B4%EC%BC%80%EC%96%B4',
      '바디케어': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010003&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EB%B0%94%EB%94%94%EC%BC%80%EC%96%B4',
      '선케어': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010011&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EC%84%A0%EC%BC%80%EC%96%B4',
      '메이크업': 'https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010002&pageIdx=1&rowsPerPage=100&t_page=%EB%9E%AD%ED%82%B9&t_click=%ED%8C%90%EB%A7%A4%EB%9E%AD%ED%82%B9_%EB%A9%94%EC%9D%B4%ED%81%AC%EC%97%85',
    }

    const targetUrl = categoryName && CATEGORY_URLS[categoryName]
      ? CATEGORY_URLS[categoryName]
      : RANKING_URL

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // 상품 리스트가 로드될 때까지 명시적으로 대기
    try {
      await page.waitForSelector('.cate_prd_list li', { timeout: 5000 })
    } catch (e) {
      console.warn('상품 리스트 셀렉터를 찾는데 시간이 걸리거나 실패했습니다.')
    }

    // 데이터 추출
    const html = await page.content()
    const $ = cheerio.load(html)

    const products: any[] = []

    // DB 저장을 위한 product_type 결정
    const productType = categoryName && categoryName !== '전체'
      ? `ranking_beauty_${categoryName}` // 예: ranking_beauty_스킨케어
      : 'ranking_beauty'

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
          product_type: productType,
          updated_at: new Date().toISOString(),
        })
      }
    })

    console.log(`✨ ${products.length}개 상품 추출 완료 (${productType}).`)

    if (products.length === 0) {
      return { success: false, error: '상품을 하나도 찾지 못했습니다.' }
    }

    // DB 저장 (Upsert 사용)
    const supabase = createClient()

    // 이전 데이터 삭제 (해당 카테고리만)
    // 랭킹은 갱신될 때마다 순위가 바뀌므로, 해당 타입의 기존 데이터를 지우고 새로 넣는 것이 깔끔함
    // Upsert 대신 Delete-Insert 전략 사용 (순위 변동 대응)

    await supabase.from('products').delete().eq('product_type', productType)

    const { error: insertError } = await supabase.from('products').insert(products)

    if (insertError) {
      throw new Error(`DB 저장 실패: ${insertError.message}`)
    }

    return { success: true, count: products.length }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Scraping error:', errorMessage)
    return { success: false, error: errorMessage }
  } finally {
    if (browser) await browser.close().catch(() => { })
  }
}
