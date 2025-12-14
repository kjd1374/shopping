'use server'

import * as cheerio from 'cheerio'
import { getBrowser } from '../lib/puppeteer'

export async function debugCategoryIds() {
    let browser = null
    try {
        browser = await getBrowser()
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36')

        await page.goto('https://www.oliveyoung.co.kr/store/main/getBestList.do', { waitUntil: 'networkidle2' })

        const html = await page.content()
        const $ = cheerio.load(html)

        const categories: { name: string, id: string }[] = []

        // Select the category tabs - selector might need adjustment based on inspection
        // Usually it's something like .cate_list or unique classes
        // Based on common structure:
        $('div.common_menubox ul.mn_list li a').each((_, el) => {
            const name = $(el).text().trim();
            const dataRef = $(el).attr('data-ref-goodsno') || $(el).attr('href'); // href might contain dispCatNo
            categories.push({ name, id: dataRef || 'unknown' });
        });

        // Also try another selector if that one is wrong, generic link scan for 'dispCatNo'
        $('a[href*="dispCatNo"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const name = $(el).text().trim();
            if (name && href.includes('dispCatNo')) {
                const match = href.match(/dispCatNo=(\d+)/);
                if (match) {
                    categories.push({ name, id: match[1] });
                }
            }
        });

        // Filter duplicates
        const unique = categories.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.id === v.id)) === i);

        console.log('Categories found:', unique);
        return unique;

    } catch (e) {
        console.error(e);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}
