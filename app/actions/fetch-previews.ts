'use server'

import puppeteer, { Browser, Page } from 'puppeteer'
import * as cheerio from 'cheerio'

export interface ProductPreview {
  url: string
  title: string
  image: string
  error?: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function fetchProductPreviews(urls: string[]): Promise<ProductPreview[]> {
  // 유효한 URL만 필터링
  const targetUrls = urls.filter((url) => url && /^https?:\/\//i.test(url))

  if (targetUrls.length === 0) return []

  let browser: Browser | null = null

  try {
    // 브라우저 인스턴스 하나만 생성
    browser = await puppeteer.launch({ headless: true })

    // 병렬 처리를 위해 모든 페이지 작업을 Promise 배열로 생성
    const tasks = targetUrls.map(async (url) => {
      let page: Page | null = null
      try {
        if (!browser) throw new Error('Browser not initialized')

        page = await browser.newPage()
        await page.setUserAgent(USER_AGENT)

        // 리소스 로딩 최소화 (이미지, 폰트 등 차단하여 속도 향상)
        await page.setRequestInterception(true)
        page.on('request', (req) => {
          const resourceType = req.resourceType()
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort()
          } else {
            req.continue()
          }
        })

        // 타임아웃 짧게 설정 (빠른 응답을 위해)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

        const html = await page.content()
        const $ = cheerio.load(html)

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '제목 없음'
        const image = $('meta[property="og:image"]').attr('content') || ''

        return {
          url,
          title: title.trim(),
          image: image.trim(),
        }
      } catch (error) {
        console.error(`Error fetching ${url}:`, error)
        return {
          url,
          title: '불러오기 실패',
          image: '',
          error: '정보를 가져올 수 없습니다.',
        }
      } finally {
        if (page) await page.close().catch(() => { })
      }
    })

    // 모든 작업 병렬 실행 및 대기
    const results = await Promise.all(tasks)
    return results

  } catch (error) {
    console.error('Puppeteer error:', error)
    return targetUrls.map(url => ({ url, title: '에러 발생', image: '', error: '브라우저 실행 실패' }))
  } finally {
    if (browser) await browser.close().catch(() => { })
  }
}

