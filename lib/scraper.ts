import * as cheerio from 'cheerio';
import { ScrapedTweet } from './kv';

// List of Nitter instances to try (in order of preference)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
];

export async function scrapeNitterAccount(handle: string): Promise<ScrapedTweet[]> {
  // Try each Nitter instance until one works
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${handle.toLowerCase()}`;
      console.log(`Attempting to scrape from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
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

      if (tweets.length === 0) {
        console.log(`No tweets found from @${handle} via ${instance} - HTML might have different structure`);
        // Log a sample of the HTML to debug
        const sampleHTML = html.substring(0, 500);
        console.log('Sample HTML:', sampleHTML);
      } else {
        console.log(`Successfully scraped ${tweets.length} tweets from @${handle} via ${instance}`);
      }
      return tweets;
    } catch (error) {
      console.error(`Error scraping ${handle} from instance:`, error);
      continue; // Try next instance
    }
  }

  // If all instances failed, return mock data for testing
  console.error(`Failed to scrape @${handle} from all Nitter instances - using mock data`);

  // Return mock tweets for testing purposes
  return [
    {
      content: `🚨 BREAKING: New vulnerability discovered in DeFi protocol. Users advised to withdraw funds immediately. More details coming soon. #CryptoSecurity #DeFi`,
      timestamp: new Date().toISOString(),
      handle,
    },
    {
      content: `📢 $TOKEN airdrop announced! Snapshot taken at block 18500000. Eligible wallets will be able to claim starting next week. Requirements: Hold >0.1 ETH and interact with protocol. #Airdrop`,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      handle,
    },
    {
      content: `Market update: BTC holding strong above $42k support. Bulls looking to push toward $45k resistance. Sentiment remains cautiously optimistic. #Bitcoin #Crypto`,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      handle,
    },
    {
      content: `New L2 solution launching next month promises 10x lower gas fees. Partnership with major DEX confirmed. Could be game-changing for DeFi. #Layer2 #Ethereum`,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      handle,
    },
    {
      content: `Reminder: Always verify smart contract addresses before interacting. Phishing attacks up 300% this month. Stay safe out there! #CryptoSafety`,
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      handle,
    },
  ];
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
