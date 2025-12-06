import { Browser } from 'puppeteer-core'

let chromium: any
let puppeteer: any

if (process.env.NODE_ENV === 'production') {
    chromium = require('@sparticuz/chromium')
    puppeteer = require('puppeteer-core')
} else {
    puppeteer = require('puppeteer')
}

export async function getBrowser(): Promise<Browser> {
    let browser: Browser

    if (process.env.NODE_ENV === 'production') {
        chromium.setGraphicsMode = false
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        })
    } else {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
    }

    return browser
}
