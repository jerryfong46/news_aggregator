import { NextRequest, NextResponse } from 'next/server';
import { getHandles, saveDailySummary } from '@/lib/kv';
import { scrapeAllHandlesWithBrowser } from '@/lib/scraper-puppeteer';
import { generateSummary } from '@/lib/summarizer';

export const maxDuration = 300; // 5 minutes max execution time for Vercel

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily scrape...');

    // Get all configured handles
    const handleData = await getHandles();
    if (handleData.length === 0) {
      console.log('No handles configured');
      return NextResponse.json({
        message: 'No handles configured',
        success: true,
      });
    }

    const handles = handleData.map(h => h.handle);
    console.log(`Scraping ${handles.length} handles:`, handles);

    // Scrape all handles using headless browser
    const tweets = await scrapeAllHandlesWithBrowser(handles);
    console.log(`Scraped ${tweets.length} tweets using headless browser`);

    // Generate summary
    const summaryResult = await generateSummary(tweets);
    console.log('Generated summary');

    // Save to KV
    const today = new Date().toISOString().split('T')[0];
    await saveDailySummary({
      date: today,
      summary: summaryResult.summary,
      hacks: summaryResult.hacks,
      airdrops: summaryResult.airdrops,
      marketSentiment: summaryResult.marketSentiment,
      tweets,
      createdAt: Date.now(),
    });

    console.log('Saved summary to KV');

    return NextResponse.json({
      success: true,
      date: today,
      tweetsCount: tweets.length,
      handlesCount: handles.length,
    });
  } catch (error) {
    console.error('Error in daily scrape:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete daily scrape',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
