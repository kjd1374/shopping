'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'
import puppeteer, { Browser, Page } from 'puppeteer'

// 응답 타입 정의
export interface ProductOption {
  name: string
  price: number // 기본가 대비 추가금액 or 전체 가격 (0이면 변동 없음)
  isSoldOut?: boolean
}

export interface OliveYoungData {
  name: string
  brand: string
  price: number // 기본 판매가
  originalPrice: number // 정가 (할인 전)
  images: string[] // 메인 + 썸네일들
  category: string
  weight: number
  options: ProductOption[]
  description: string
}

export type OliveYoungResult =
  | { success: true; data: OliveYoungData }
  | { success: false; error: string }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const SYSTEM_PROMPT = `이 텍스트는 올리브영 상품 페이지의 HTML에서 추출한 정보야.
아래 JSON 스키마에 맞춰서 데이터를 구조화해줘.

{
  "name": "상품명 (텍스트 정제)",
  "brand": "브랜드명 (없으면 빈 문자열)",
  "price": 최종 판매가(숫자, 0이 아닌 실제 가격. 할인이 적용된 가장 낮은 가격),
  "originalPrice": 정가(숫자, 할인 없으면 판매가와 동일),
  "images": ["이미지URL1", "이미지URL2"...] (최대 5개, 고화질 우선),
  "category": "카테고리 경로 텍스트",
  "weight": 카테고리 기반 추정 무게(kg, 숫자),
  "description": "상품 간단 설명 (한 줄 요약)",
  "options": [
    {
      "name": "옵션명",
      "price": 옵션별 추가금액(없으면 0, 전체 가격이면 전체 가격 - 기본가),
      "isSoldOut": 품절여부(boolean)
    }
  ]
}

가격(price) 규칙:
1. JSON-LD의 "Offers" > "price" (lowPrice)를 최우선으로 사용.
2. HTML에서 여러 가격이 보이면, 그 중 **가장 낮은 숫자**가 최종 판매가(할인가)야.
3. 정가(originalPrice)는 보통 높은 가격(취소선 그어진 가격)이야.
4. 가격은 절대 0원이 될 수 없어.

옵션이 없다면 "options": [] 로 반환해.
반드시 순수 JSON 문자열만 반환해.`

export async function parseOliveYoung(url: string): Promise<OliveYoungResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { success: false, error: '유효한 URL을 입력해주세요.' }
  }

  let browser: Browser | null = null
  let html = ''

  try {
    browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)

    // 페이지 로드 대기
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45_000,
    })

    // 가격 로딩이 늦을 수 있으므로 특정 요소 대기 시도 (최대 3초)
    try {
      await page.waitForSelector('.price-2 strong, .price strong, input[name="price"]', { timeout: 3000 })
    } catch (e) {
      // 무시하고 진행
    }

    html = await page.content()
  } catch (browserError) {
    console.error('[parseOliveYoung] puppeteer error:', browserError)
    return { success: false, error: '브라우저 실행 실패' }
  } finally {
    if (browser) {
      await browser.close().catch(() => { })
    }
  }

  if (!html) {
    return { success: false, error: '페이지를 가져올 수 없습니다.' }
  }

  try {
    const $ = cheerio.load(html)

    // 1. JSON-LD 데이터 수집 (가장 정확함)
    let jsonLdText = ''
    $('script[type="application/ld+json"]').each((_, el) => {
      jsonLdText += $(el).html() + '\n'
    })

    // 2. 메타 태그 수집
    const metaBlock = $('meta[property^="og:"]')
      .map((_, el) => {
        const p = $(el).attr('property')
        const c = $(el).attr('content')
        return p && c ? `${p}: ${c}` : ''
      })
      .get()
      .join('\n')

    // 3. 가격/상품명/카테고리 텍스트 수집 (모든 가격 후보군 수집)
    const priceText = $('.price-2 strong').text() || $('.price-2').text() || $('.price strong').text() || $('.price').text()
    const originalPriceText = $('.price-1 strike').text() || $('.price-1').text()
    const brandText = $('.brand_info').text().trim()
    const nameText = $('.tit_product').text().trim()
    const categoryText = $('#location').text().trim() || $('.loc_history').text().trim()

    // 숨겨진 input 값에서도 가격 찾기
    const hiddenPrice = $('input[name="price"]').val() || $('input[id="price"]').val()

    // 4. 이미지 수집
    const images: string[] = []
    const mainImg = $('meta[property="og:image"]').attr('content')
    if (mainImg) images.push(mainImg)
    $('.prd_thumb_list img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-original')
      if (src && !images.includes(src)) images.push(src)
    })

    // 5. 옵션 영역 텍스트
    const optionsText = $('select option')
      .map((_, el) => $(el).text().trim())
      .get()
      .join('\n')
    const customOptionsText = $('.option_list li, .opt_list li')
      .map((_, el) => $(el).text().trim())
      .get()
      .join('\n')

    const detailText = $('#contents').text().replace(/\s+/g, ' ').trim().slice(0, 1000)

    // Gemini에게 보낼 최종 텍스트
    const promptContext = `
URL: ${url}
[JSON-LD 구조화 데이터]
${jsonLdText}

[메타정보]
${metaBlock}

[HTML 요소 정보]
브랜드: ${brandText}
상품명: ${nameText}
판매가(텍스트): ${priceText}
정가(텍스트): ${originalPriceText}
숨겨진 가격값: ${hiddenPrice}
카테고리: ${categoryText}

[이미지소스]
${images.join('\n')}

[옵션정보(Raw)]
${optionsText}
${customOptionsText}

[상세내용 일부]
${detailText}
`

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Gemini API 키가 설정되지 않았습니다.' }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${promptContext}`)
    const textResponse = result.response.text()

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없습니다.')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // 최종 가격 검증: 0원이면 메타데이터나 히든값에서 다시 시도
    let finalPrice = Number(parsed.price) || 0
    if (finalPrice === 0 && hiddenPrice) finalPrice = Number(hiddenPrice)

    return {
      success: true,
      data: {
        name: parsed.name || nameText,
        brand: parsed.brand || brandText,
        price: finalPrice,
        originalPrice: Number(parsed.originalPrice) || finalPrice,
        images: Array.isArray(parsed.images) && parsed.images.length > 0 ? parsed.images : images,
        category: parsed.category || categoryText,
        weight: Number(parsed.weight) || 0.5,
        options: Array.isArray(parsed.options) ? parsed.options : [],
        description: parsed.description || '',
      },
    }
  } catch (error) {
    console.error('[parseOliveYoung] error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
    }
  }
}
