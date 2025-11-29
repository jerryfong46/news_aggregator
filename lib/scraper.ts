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

      // Get timestamp for 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Scrape tweets from the timeline
      $('.timeline-item').each((_, element) => {
        const $tweet = $(element);

        // Get tweet content
        const content = $tweet.find('.tweet-content').text().trim();

        // Get timestamp - try multiple selectors
        let timestamp = $tweet.find('.tweet-date a').attr('title') ||
                       $tweet.find('.tweet-date').attr('title') ||
                       '';

        // Skip if no content
        if (!content) return;

        // If we have a timestamp, check if it's within 24 hours
        if (timestamp) {
          const tweetDate = new Date(timestamp);
          if (tweetDate < twentyFourHoursAgo) {
            return; // Skip old tweets
          }
        }

        // Include the tweet (either it's recent or we couldn't parse the date)
        tweets.push({
          content,
          timestamp: timestamp || 'Unknown',
          handle,
        });
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
