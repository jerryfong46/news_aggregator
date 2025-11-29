import { NextRequest, NextResponse } from 'next/server';
import { getHandles, saveDailySummary } from '@/lib/kv';
import { scrapeAllHandles } from '@/lib/scraper';
import { generateSummary } from '@/lib/summarizer';

export const maxDuration = 300; // 5 minutes max execution time

export async function POST(request: NextRequest) {
  try {
    console.log('Starting manual scrape...');

    // Get all configured handles
    const handleData = await getHandles();
    if (handleData.length === 0) {
      return NextResponse.json({
        message: 'No handles configured. Please add some Twitter handles first.',
        success: false,
      }, { status: 400 });
    }

    const handles = handleData.map(h => h.handle);
    console.log(`Scraping ${handles.length} handles:`, handles);

    // Scrape all handles
    const tweets = await scrapeAllHandles(handles);
    console.log(`Scraped ${tweets.length} tweets`);

    if (tweets.length === 0) {
      return NextResponse.json({
        message: 'No tweets found from the last 24 hours.',
        success: true,
        tweetsCount: 0,
        handlesCount: handles.length,
      });
    }

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
      message: 'Successfully scraped and summarized tweets!',
      date: today,
      tweetsCount: tweets.length,
      handlesCount: handles.length,
    });
  } catch (error) {
    console.error('Error in manual scrape:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete scrape',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
