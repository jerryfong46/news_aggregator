import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { ScrapedTweet } from './kv';

// List of Nitter instances to try
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.1d4.us',
];

export async function scrapeNitterAccountWithBrowser(handle: string): Promise<ScrapedTweet[]> {
  let browser;

  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${handle.toLowerCase()}`;
      console.log(`Attempting to scrape from: ${url} using headless browser`);

      // Launch browser
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for timeline to load
      await page.waitForSelector('.timeline-item', { timeout: 10000 }).catch(() => {
        console.log('Timeline items not found on page');
      });

      // Extract tweets
      const tweets = await page.evaluate((handleName) => {
        const items = document.querySelectorAll('.timeline-item');
        const results: { content: string; timestamp: string; handle: string }[] = [];

        let count = 0;
        items.forEach((item) => {
          if (count >= 10) return;

          const contentEl = item.querySelector('.tweet-content');
          const dateEl = item.querySelector('.tweet-date a');

          if (contentEl) {
            const content = contentEl.textContent?.trim() || '';
            const timestamp = dateEl?.getAttribute('title') || 'Recent';

            if (content) {
              results.push({
                content,
                timestamp,
                handle: handleName,
              });
              count++;
            }
          }
        });

        return results;
      }, handle);

      await browser.close();
      browser = undefined;

      console.log(`Successfully scraped ${tweets.length} tweets from @${handle} via ${instance}`);

      if (tweets.length > 0) {
        return tweets as ScrapedTweet[];
      }
    } catch (error) {
      console.error(`Error scraping ${handle} from ${instance}:`, error);
      if (browser) {
        await browser.close().catch(() => {});
        browser = undefined;
      }
      continue;
    }
  }

  throw new Error(`Failed to scrape @${handle} from all Nitter instances using browser`);
}

export async function scrapeAllHandlesWithBrowser(handles: string[]): Promise<ScrapedTweet[]> {
  const allTweets: ScrapedTweet[] = [];
  const errors: string[] = [];

  for (const handle of handles) {
    try {
      const tweets = await scrapeNitterAccountWithBrowser(handle);
      allTweets.push(...tweets);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`@${handle}: ${errorMsg}`);
      console.error(`Failed to scrape @${handle}:`, errorMsg);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (allTweets.length === 0 && errors.length > 0) {
    throw new Error(`Failed to scrape any handles. Errors:\n${errors.join('\n')}`);
  }

  return allTweets;
}
