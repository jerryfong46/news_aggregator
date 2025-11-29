import * as cheerio from 'cheerio';
import { ScrapedTweet } from './kv';

export async function scrapeNitterAccount(handle: string): Promise<ScrapedTweet[]> {
  const url = `https://nitter.net/${handle.toLowerCase()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const tweets: ScrapedTweet[] = [];

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Scrape tweets from the timeline
    $('.timeline-item').each((_, element) => {
      const $tweet = $(element);

      // Get tweet content
      const content = $tweet.find('.tweet-content').text().trim();

      // Get timestamp
      const timestamp = $tweet.find('.tweet-date a').attr('title') || '';

      // Skip if no content
      if (!content) return;

      // Parse the timestamp and check if it's from today
      const tweetDate = new Date(timestamp);

      // Only include tweets from today
      if (tweetDate >= today) {
        tweets.push({
          content,
          timestamp,
          handle,
        });
      }
    });

    return tweets;
  } catch (error) {
    console.error(`Error scraping ${handle}:`, error);
    // Return empty array instead of throwing to allow other handles to continue
    return [];
  }
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
