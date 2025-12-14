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

    await page.goto(RANKING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // 카테고리 이동 로직 (동적 탐색)
    if (categoryName && categoryName !== '전체') {
      try {
        console.log(`🔎 '${categoryName}' 카테고리 찾는 중...`)

        // 1. 카테고리 탭 찾기 (텍스트 매칭)
        // 올리브영 랭킹 페이지 구조: .cate_list li a 혹은 .mn_list li a
        // 정확한 셀렉터를 모를 경우를 대비해 텍스트를 포함하는 a 태그 검색

        // 페이지 내에서 평가 실행 (DOM 조작)
        const targetFound = await page.evaluate((targetName) => {
          // 탭 메뉴 영역의 링크들 검색
          const links = Array.from(document.querySelectorAll('a'));
          const targetLink = links.find(el => el.textContent?.includes(targetName));

          if (targetLink) {
            targetLink.click();
            return true;
          }
          return false;
        }, categoryName);

        if (targetFound) {
          console.log(`✅ '${categoryName}' 클릭 성공, 페이지 로딩 대기...`)
          // 클릭 후 페이지 이동/갱신 대기
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
            // 네비게이션이 발생하지 않는 AJAX 갱신일 수도 있음. 잠시 대기
            return new Promise(r => setTimeout(r, 2000));
          });
        } else {
          console.warn(`⚠️ '${categoryName}' 카테고리 링크를 찾을 수 없습니다. 전체 랭킹으로 진행합니다.`)
        }

      } catch (e) {
        console.error(`카테고리 이동 실패: ${e}`)
        // 실패해도 전체 랭킹이라도 긁도록 에러를 던지지 않음
      }
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
