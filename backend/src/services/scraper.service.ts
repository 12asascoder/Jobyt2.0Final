import puppeteer from 'puppeteer';

export const ScraperService = {
  /**
   * Scrapes the text content of a given URL using a headless browser.
   * This ensures JavaScript-rendered content (like SPAs) is properly loaded.
   */
  async scrapeText(url: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();

      // Optimize scraping by blocking unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Set a generic user agent to avoid basic bot-blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

      // Wait until network is idle or max 15 seconds
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract the visible inner text of the body
      const textContent = await page.evaluate(() => {
        // Basic cleanup of script/style tags just in case
        // @ts-ignore
        document.querySelectorAll('script, style, noscript').forEach((el: any) => el.remove());
        // @ts-ignore
        return document.body.innerText;
      });

      return textContent.trim();
    } catch (error) {
      console.error(`ScraperService error for ${url}:`, error);
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await browser.close().catch(() => {});
    }
  },
};
