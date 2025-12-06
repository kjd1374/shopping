'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'

interface ProductInfo {
  name: string
  price: number
  currency: string
  category: string
  estimated_weight: number
  image: string
}

interface AnalyzeResult {
  success: boolean
  data?: ProductInfo
  error?: string
}

export async function analyzeProduct(url: string): Promise<AnalyzeResult> {
  try {
    // 1. URL 유효성 검사
    if (!url || !url.startsWith('http')) {
      return {
        success: false,
        error: '유효한 URL을 입력해주세요.',
      }
    }

    // 2. HTML Fetching
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: '페이지를 가져올 수 없습니다.',
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 3. 불필요한 태그 제거
    $('script').remove()
    $('style').remove()

    // 4. 핵심 정보 추출
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    const ogImage = $('meta[property="og:image"]').attr('content') || ''
    const ogPrice = $('meta[property="og:price:amount"]').attr('content') || ''

    // 5. Gemini AI 연동
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API 키가 설정되지 않았습니다.',
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const systemPrompt = `너는 쇼핑몰 상품 분석 AI야. 주어진 HTML 정보를 바탕으로 다음 정보를 JSON으로 추출해.
- \`name\`: 상품명 (불필요한 홍보 문구 제거)
- \`price\`: 가격 (숫자만 추출, 없으면 0)
- \`currency\`: 통화 (KRW, VND 등)
- \`category\`: 상품 카테고리 (예: 화장품, 의류, 식품, 기타)
- \`estimated_weight\`: 카테고리 기반 예상 무게(kg). (규칙: 스킨/토너=0.3, 크림/세럼=0.15, 립스틱=0.05, 샴푸=0.6, 의류=0.3, 기타=0.5)
- \`image\`: 상품 이미지 URL (og:image 태그 우선 사용)

응답은 반드시 순수한 JSON String이어야 해. 다른 설명 없이 JSON만 반환해.`

    const userPrompt = `다음은 웹페이지에서 추출한 정보야:

페이지 제목: ${ogTitle}
메인 이미지: ${ogImage}
가격 정보: ${ogPrice}
본문 텍스트 (일부): ${bodyText.substring(0, 2000)}

위 정보를 바탕으로 상품 정보를 JSON 형식으로 추출해줘.`

    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
    const responseText = result.response.text()

    // 6. JSON 파싱
    let productInfo: ProductInfo
    try {
      // JSON 코드 블록 제거
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        productInfo = JSON.parse(jsonMatch[0])
      } else {
        productInfo = JSON.parse(responseText)
      }
    } catch (parseError) {
      return {
        success: false,
        error: 'AI 응답을 파싱할 수 없습니다.',
      }
    }

    // 7. 기본값 설정 및 검증
    const finalProductInfo: ProductInfo = {
      name: productInfo.name || '상품명 없음',
      price: Number(productInfo.price) || 0,
      currency: productInfo.currency || 'KRW',
      category: productInfo.category || '기타',
      estimated_weight: Number(productInfo.estimated_weight) || 0.5,
      image: productInfo.image || ogImage || '',
    }

    return {
      success: true,
      data: finalProductInfo,
    }
  } catch (error) {
    console.error('상품 분석 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}

