import * as cheerio from 'cheerio'
import { getBrowser } from './puppeteer'
import { ScrapedProduct } from './scraper'

// 무신사 랭킹 User-Agent
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

// 카테고리별 URL 매핑
const MUSINSA_URLS: Record<string, string> = {
    '전체': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=000&ageBand=AGE_BAND_ALL',
    '상의': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=001000&ageBand=AGE_BAND_ALL&subPan=product',
    '아우터': 'https://www.musinsa.com/main/musinsa/ranking?gf=A&storeCode=musinsa&sectionId=200&contentsId=&categoryCode=002000&ageBand=AGE_BAND_ALL&subPan=product',
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

        // 1. 신형/구형 선택자 모두 시도하기 위해 넉넉히 대기
        // UIProductColumn__Wrap (신형) 혹은 li[data-goods-id] (구형)
        try {
            await page.waitForFunction(() => {
                return document.querySelectorAll('div[class*="UIProductColumn__Wrap"]').length > 0 ||
                    document.querySelectorAll('li[data-goods-id]').length > 0
            }, { timeout: 10000 })
        } catch (e) {
            console.warn('무신사 상품 리스트 셀렉터 대기 실패 (페이지 구조 확인 필요)')
        }

        const html = await page.content()
        const $ = cheerio.load(html)
        const products: ScrapedProduct[] = []

        const productType = categoryName && categoryName !== '전체'
            ? `ranking_fashion_${categoryName}`
            : 'ranking_fashion'

        // 전략 A: 신형 구조 (styled-components)
        const imgLinks = $('a[href*="/products/"][class*="UIProductColumn__Anchor"]')

        let count = 0
        imgLinks.each((_, el) => {
            if (count >= 10) return

            const $imgLink = $(el)
            const $imgTag = $imgLink.find('img')

            // 이미지 있는 링크만 처리
            if ($imgTag.length === 0) return

            count++
            const rank = count

            // 컨테이너 찾기 (부모 li 혹은 상위 div)
            const $container = $imgLink.parents('li').first().length > 0
                ? $imgLink.parents('li').first()
                : $imgLink.parent().parent()

            let brand = $container.find('a[href*="/brand/"]').text().trim()
            if (!brand) brand = $imgLink.nextAll('div').find('a[href*="/brand/"]').text().trim()

            let title = ''
            const titleLinks = $container.find('a[href*="/products/"]').not($imgLink)
            if (titleLinks.length > 0) title = titleLinks.first().text().trim()
            if (!title) title = $imgLink.nextAll('div').find('a[href*="/products/"]').text().trim()
            if (!title) title = $imgLink.attr('title') || ''

            let image = $imgTag.attr('data-original') || $imgTag.attr('src') || ''
            let originUrl = $imgLink.attr('href') || ''

            if (originUrl && !originUrl.startsWith('http')) originUrl = `https://www.musinsa.com${originUrl}`
            if (image && !image.startsWith('http')) {
                if (image.startsWith('//')) image = `https:${image}`
            }

            if (title && image) {
                products.push({
                    rank, title, brand, image, origin_url: originUrl, product_type: productType, updated_at: new Date().toISOString(),
                })
            }
        })

        // 전략 B: 구형 구조 (fallback)
        if (products.length === 0) {
            console.log('Falling back to legacy selectors...')
            $('li[data-goods-id]').each((idx, el) => {
                if (idx >= 10) return
                const $el = $(el)
                const rank = idx + 1
                const brand = $el.find('p.n-brand-name a').text().trim()
                const title = $el.find('p.n-goods-name a').text().trim()
                const imgTag = $el.find('img')
                let image = imgTag.attr('data-original') || imgTag.attr('src') || ''
                let originUrl = $el.find('p.n-goods-name a').attr('href') || ''
                if (originUrl && !originUrl.startsWith('http')) originUrl = `https://www.musinsa.com${originUrl}`
                if (image && !image.startsWith('http')) {
                    if (image.startsWith('//')) image = `https:${image}`
                }
                if (title && image) {
                    products.push({
                        rank, title, brand, image, origin_url: originUrl, product_type: productType, updated_at: new Date().toISOString()
                    })
                }
            })
        }

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
