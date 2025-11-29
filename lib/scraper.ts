import * as cheerio from 'cheerio';
import { ScrapedTweet } from './kv';

// List of Nitter instances to try (in order of preference)
const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.net',
];

export async function scrapeNitterAccount(handle: string): Promise<ScrapedTweet[]> {
  // Try each Nitter instance until one works
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${handle.toLowerCase()}`;
      console.log(`Attempting to scrape from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        console.log(`Failed to fetch ${url}: ${response.status}`);
        continue; // Try next instance
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const tweets: ScrapedTweet[] = [];

      // Just grab the first 10 tweets - no date filtering
      let count = 0;
      $('.timeline-item').each((_, element) => {
        if (count >= 10) return false; // Stop after 10 tweets

        const $tweet = $(element);

        // Get tweet content
        const content = $tweet.find('.tweet-content').text().trim();

        // Skip if no content
        if (!content) return;

        // Get timestamp if available
        const timestamp = $tweet.find('.tweet-date a').attr('title') ||
                         $tweet.find('.tweet-date').attr('title') ||
                         'Recent';

        tweets.push({
          content,
          timestamp,
          handle,
        });

        count++;
      });

      console.log(`Successfully scraped ${tweets.length} tweets from @${handle} via ${instance}`);
      return tweets;
    } catch (error) {
      console.error(`Error scraping ${handle} from instance:`, error);
      continue; // Try next instance
    }
  }

  // If all instances failed
  console.error(`Failed to scrape @${handle} from all Nitter instances`);
  return [];
}

export async function scrapeAllHandles(handles: string[]): Promise<ScrapedTweet[]> {
  const allTweets: ScrapedTweet[] = [];

  // Scrape handles sequentially to avoid rate limiting
  for (const handle of handles) {
    const tweets = await scrapeNitterAccount(handle);
    allTweets.push(...tweets);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allTweets;
}
