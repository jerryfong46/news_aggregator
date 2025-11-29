import OpenAI from 'openai';
import { ScrapedTweet } from './kv';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SummaryResult {
  summary: string;
  hacks: string[];
  airdrops: string[];
  marketSentiment: string;
}

export async function generateSummary(tweets: ScrapedTweet[]): Promise<SummaryResult> {
  if (tweets.length === 0) {
    return {
      summary: 'No tweets found for today.',
      hacks: [],
      airdrops: [],
      marketSentiment: 'No data available',
    };
  }

  // Prepare tweets text
  const tweetsText = tweets
    .map((t, i) => `[${i + 1}] @${t.handle}: ${t.content}`)
    .join('\n\n');

  const prompt = `You are analyzing crypto Twitter posts from today. Below are tweets from various accounts:

${tweetsText}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "A concise 2-3 paragraph summary of the main themes and highlights",
  "hacks": ["List any security incidents, exploits, or hacks mentioned (empty array if none)"],
  "airdrops": ["List any airdrop announcements or opportunities mentioned (empty array if none)"],
  "marketSentiment": "Overall market sentiment (bullish/bearish/neutral) with brief explanation"
}

Focus on:
1. Security incidents and hacks
2. Airdrop opportunities
3. Market sentiment and trends
4. Major announcements or events

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a crypto market analyst who summarizes Twitter activity. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const result = JSON.parse(content) as SummaryResult;

    return {
      summary: result.summary || 'No summary generated',
      hacks: Array.isArray(result.hacks) ? result.hacks : [],
      airdrops: Array.isArray(result.airdrops) ? result.airdrops : [],
      marketSentiment: result.marketSentiment || 'Unknown',
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error('Failed to generate summary');
  }
}
