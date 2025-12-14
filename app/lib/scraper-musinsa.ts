import * as cheerio from 'cheerio'
import { getBrowser } from './puppeteer'
import { ScrapedProduct } from './scraper'

// 무신사 랭킹 User-Agent
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

// 카테고리별 URL 매핑
const MUSINSA_URLS: Record<string, string> = {
    '전체': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=000&ageBand=AGE_BAND_ALL',
    '상의': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=001000&ageBand=AGE_BAND_ALL&subPan=product',
    '아우터': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=002000&ageBand=AGE_BAND_ALL&subPan=product', // User provided 001000, corrected to 002000 for Outer
    '바지': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=003000&ageBand=AGE_BAND_ALL&subPan=product',
    '원피스/스커트': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=100000&ageBand=AGE_BAND_ALL&subPan=product',
    '가방': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=004000&ageBand=AGE_BAND_ALL&subPan=product',
    '신발': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=103000&ageBand=AGE_BAND_ALL&subPan=product',
    '속옷/홈웨어': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=026000&ageBand=AGE_BAND_ALL&subPan=product',
    '뷰티': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=104000&ageBand=AGE_BAND_ALL&subPan=product'
}

export async function crawlMusinsaRanking(categoryName?: string) {
    let browser = null

    try {
        console.log(`🚀 무신사 랭킹 크롤링 시작... (카테고리: ${categoryName || '전체'})`)

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

        const targetUrl = categoryName && MUSINSA_URLS[categoryName]
            ? MUSINSA_URLS[categoryName]
            : MUSINSA_URLS['전체']

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 })

        // 상품 리스트 대기 (li[data-goods-id]가 나타날 때까지)
        try {
            await page.waitForSelector('li[data-goods-id]', { timeout: 10000 })
        } catch (e) {
            console.warn('무신사 상품 리스트 셀렉터를 찾는데 실패했습니다. 페이지 구조가 변경되었을 수 있습니다.')
        }

        const html = await page.content()
        const $ = cheerio.load(html)
        const products: ScrapedProduct[] = []

        // DB 저장을 위한 product_type 결정
        // Fashion 카테고리는 'ranking_fashion_{category}' 형식 사용 (전체는 ranking_fashion)
        const productType = categoryName && categoryName !== '전체'
            ? `ranking_fashion_${categoryName}`
            : 'ranking_fashion'

        // 무신사 DOM 파싱
        $('li[data-goods-id]').each((idx, el) => {
            if (idx >= 10) return

            const $el = $(el)
            const rank = idx + 1

            // Selectors based on inspection
            const brand = $el.find('p.n-brand-name a').text().trim() || $el.find('.item_title').text().trim()
            const title = $el.find('p.n-goods-name a').text().trim() || $el.find('.list_info a').attr('title') || ''

            const imgTag = $el.find('img')
            let image = imgTag.attr('data-original') || imgTag.attr('src') || ''

            const linkTag = $el.find('p.n-goods-name a')
            let originUrl = linkTag.attr('href') || $el.find('.list_info a').attr('href') || ''

            // URL 정규화
            if (originUrl && !originUrl.startsWith('http')) {
                originUrl = `https://www.musinsa.com${originUrl}`
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

        console.log(`✨ 무신사: ${products.length}개 상품 추출 완료 (${productType}).`)
        return { success: true, data: products, productType }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Musinsa Scraping error:', errorMessage)
        return { success: false, error: errorMessage }
    } finally {
        if (browser) await browser.close().catch(() => { })
    }
}
