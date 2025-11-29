import { kv } from '@vercel/kv';

export interface TwitterHandle {
  id: string;
  handle: string;
  addedAt: number;
}

export interface ScrapedTweet {
  content: string;
  timestamp: string;
  handle: string;
}

export interface DailySummary {
  date: string;
  summary: string;
  hacks: string[];
  airdrops: string[];
  marketSentiment: string;
  tweets: ScrapedTweet[];
  createdAt: number;
}

const HANDLES_KEY = 'twitter:handles';
const SUMMARY_PREFIX = 'twitter:summary:';

export async function getHandles(): Promise<TwitterHandle[]> {
  const handles = await kv.get<TwitterHandle[]>(HANDLES_KEY);
  return handles || [];
}

export async function addHandle(handle: string): Promise<TwitterHandle> {
  const handles = await getHandles();

  // Check if handle already exists
  if (handles.some(h => h.handle.toLowerCase() === handle.toLowerCase())) {
    throw new Error('Handle already exists');
  }

  const newHandle: TwitterHandle = {
    id: crypto.randomUUID(),
    handle: handle.replace('@', ''),
    addedAt: Date.now(),
  };

  await kv.set(HANDLES_KEY, [...handles, newHandle]);
  return newHandle;
}

export async function removeHandle(id: string): Promise<void> {
  const handles = await getHandles();
  const filtered = handles.filter(h => h.id !== id);
  await kv.set(HANDLES_KEY, filtered);
}

export async function saveDailySummary(summary: DailySummary): Promise<void> {
  const key = `${SUMMARY_PREFIX}${summary.date}`;
  await kv.set(key, summary);
  // Set expiry to 30 days
  await kv.expire(key, 60 * 60 * 24 * 30);
}

export async function getDailySummary(date: string): Promise<DailySummary | null> {
  const key = `${SUMMARY_PREFIX}${date}`;
  return await kv.get<DailySummary>(key);
}

export async function getRecentSummaries(limit: number = 7): Promise<DailySummary[]> {
  const summaries: DailySummary[] = [];
  const today = new Date();

  for (let i = 0; i < limit; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const summary = await getDailySummary(dateStr);
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries;
}
