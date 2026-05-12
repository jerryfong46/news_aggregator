import { NextResponse } from 'next/server';
import { getProgressEvents, summarizeDailyEvents } from '@/lib/progress';
import { renderPortugueseReviewLog, renderWorkoutLog, upsertVaultFile } from '@/lib/vault-export';

export const maxDuration = 60;

function torontoIsoDate(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  return isVercelCron || (!!secret && supplied === secret);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? torontoIsoDate();

  try {
    const events = await getProgressEvents(date);
    const exportData = summarizeDailyEvents(date, events);

    if (events.length === 0) {
      return NextResponse.json({ ok: true, date, exported: false, reason: 'No progress events' });
    }

    const writes: Promise<void>[] = [];
    if (exportData.pt.reviews.length > 0) {
      writes.push(upsertVaultFile(
        `Resources/Portuguese/Review Logs/${date}.md`,
        renderPortugueseReviewLog(exportData),
        `Export Portuguese review log ${date}`,
      ));
    }

    if (exportData.workout.completed.length > 0 || exportData.workout.lifts.length > 0) {
      writes.push(upsertVaultFile(
        `Areas/Fitness/Workout Logs/${date}.md`,
        renderWorkoutLog(exportData),
        `Export workout log ${date}`,
      ));
    }

    await Promise.all(writes);
    return NextResponse.json({ ok: true, date, exported: true, writes: writes.length });
  } catch (error) {
    console.error('vault_export_failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}
