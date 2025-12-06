'use server'

import puppeteer, { Browser } from 'puppeteer'
import * as cheerio from 'cheerio'

export interface PreviewResult {
  url: string
  title: string
  images: string[]
  error?: string
}

// 더 강력한 일반 사용자 위장 헤더
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

export async function getUrlPreview(url: string): Promise<PreviewResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { url, title: '', images: [], error: '유효한 URL이 아닙니다.' }
  }

  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    // 헤더 강화
    await page.setUserAgent(USER_AGENT)
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/' // 구글 검색 유입으로 위장
    })

    // 쿠팡/다이소몰 등은 리소스 차단 시 빈 화면이 나올 수 있어 차단 완화
    // (중요한 스크립트가 차단되면 렌더링 안됨)
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      // 폰트만 차단, 이미지는 수집해야 하므로 허용하되 로딩만 막거나(Abort) URL만 딸 수 있으면 좋음
      // 하지만 여기선 일단 폰트, 미디어만 차단
      if (['font', 'media'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    // 네트워크 대기 조건 강화 (동적 로딩 기다림)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })

    // 일부 사이트는 스크롤해야 이미지가 로딩됨
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight / 2)
      await new Promise(r => setTimeout(r, 1000))
    })

    const html = await page.content()
    const $ = cheerio.load(html)

    // 1. 제목 추출
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      '제목 없음'

    // 2. 이미지 수집
    const imageSet = new Set<string>()

    // OG 태그
    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) imageSet.add(ogImage)

    // img 태그
    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-original') || $(el).attr('data-src') // data-src 등 지연로딩 속성 체크
      if (src) {
        // 상대경로 처리
        if (src.startsWith('//')) src = 'https:' + src
        if (src.startsWith('/')) src = new URL(src, url).href

        if (src.startsWith('http')) {
          // 크기 필터링 (속성값 기준)
          const w = $(el).attr('width')
          const h = $(el).attr('height')
          if (w && Number(w) < 100) return
          if (h && Number(h) < 100) return

          imageSet.add(src)
        }
      }
    })

    // CSS background-image 추출 (다이소몰 등에서 사용 가능성)
    // 하지만 Cheerio로는 스타일 파싱이 어려우므로 생략하거나 정규식으로 시도 가능
    // 여기서는 간단히 og:image가 없다면 대표 이미지를 찾기 위해 본문 내 큰 이미지 우선

    const images = Array.from(imageSet).slice(0, 5)

    return {
      url,
      title: title.trim(),
      images,
    }

  } catch (error) {
    console.error(`Preview error for ${url}:`, error)
    return {
      url,
      title: 'Access Denied (보안 접속 불가)',
      images: [],
      error: '보안 정책으로 인해 정보를 가져올 수 없습니다.',
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => { })
    }
  }
}
