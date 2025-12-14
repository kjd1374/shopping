'use server'

import * as cheerio from 'cheerio'
import { getBrowser } from '../lib/puppeteer'

export async function fetchCategoryUrls() {
    let browser = null
    try {
        console.log('Fetching category URLs...')
        browser = await getBrowser()
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')

        await page.goto('https://www.oliveyoung.co.kr/store/main/getBestList.do', { waitUntil: 'domcontentloaded' })

        const html = await page.content()
        const $ = cheerio.load(html)

        const categories: Record<string, string> = {}

        // 타겟 카테고리 이름들
        const targets = ['스킨케어', '마스크팩', '클렌징', '더모 코스메틱', '헤어케어', '바디케어']

        $('a').each((_, el) => {
            const text = $(el).text().trim()
            const href = $(el).attr('href')

            if (targets.includes(text) && href) {
                if (href.startsWith('javascript:')) {
                    // moveCategory('100000100010008') 같은 형식일 수 있음
                    const match = href.match(/'([^']+)'/)
                    if (match) {
                        categories[text] = `https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=${match[1]}&fltDispCatNo=&pageIdx=1&rowsPerPage=8`
                    }
                } else if (href.includes('dispCatNo')) {
                    categories[text] = href.startsWith('http') ? href : `https://www.oliveyoung.co.kr${href}`
                }
            }
        })

        console.log('Mapped URLs:', JSON.stringify(categories, null, 2))
        return categories

    } finally {
        if (browser) await browser.close()
    }
}
