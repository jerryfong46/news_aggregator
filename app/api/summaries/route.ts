import { NextRequest, NextResponse } from 'next/server';
import { getDailySummary, getRecentSummaries } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = searchParams.get('limit');

    if (date) {
      // Get specific date summary
      const summary = await getDailySummary(date);
      if (!summary) {
        return NextResponse.json(
          { error: 'Summary not found for this date' },
          { status: 404 }
        );
      }
      return NextResponse.json({ summary });
    }

    // Get recent summaries
    const limitNum = limit ? parseInt(limit, 10) : 7;
    const summaries = await getRecentSummaries(limitNum);
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    );
  }
}
