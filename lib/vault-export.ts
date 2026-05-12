import type { DailyExport } from './progress';

const REPO = 'jerryfong46/obsidian-vault';
const BASE = 'https://api.github.com';

interface GitHubContentResponse {
  sha: string;
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function getFileSha(path: string, token: string): Promise<string | null> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${encodedPath}`, {
    headers: githubHeaders(token),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed for ${path}: ${res.status}`);
  const body = (await res.json()) as GitHubContentResponse;
  return body.sha;
}

export async function upsertVaultFile(path: string, content: string, message: string) {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error('GITHUB_PAT is not configured');

  const sha = await getFileSha(path, token);
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub write failed for ${path}: ${res.status} ${body}`);
  }
}

function lineForCard(review: DailyExport['pt']['reviews'][number]) {
  const status = review.rating === 'easy' ? 'Easy' : review.rating === 'hard' ? 'Hard' : 'Again';
  return `- ${status}: **${review.front}** -> ${review.back} (${review.tag})`;
}

export function renderPortugueseReviewLog(exportData: DailyExport): string {
  const learned = exportData.pt.learned;
  const hard = exportData.pt.hard;

  return `# Portuguese Review Log — ${exportData.date}

Related: [[../SR Review|SR Review]] · [[../Progress Tracker|Progress Tracker]]

## KPI

- Total reviews: ${exportData.pt.reviews.length}
- Learned words/cards: ${learned.length}
- Hard/again queue: ${hard.length}

## Learned

${learned.length ? learned.map(lineForCard).join('\n') : '- None'}

## Review Again

${hard.length ? hard.map(lineForCard).join('\n') : '- None'}

## All Reviews

${exportData.pt.reviews.length ? exportData.pt.reviews.map(lineForCard).join('\n') : '- No reviews logged'}
`;
}

export function renderWorkoutLog(exportData: DailyExport): string {
  const latestCompleted = exportData.workout.completed.at(-1);
  const latestByLift = new Map<string, DailyExport['workout']['lifts'][number]>();
  exportData.workout.lifts.forEach(lift => latestByLift.set(lift.liftName, lift));
  const lifts = Array.from(latestByLift.values());

  return `# Workout Log — ${exportData.date}

Related: [[../Current Program - PPL-PP Split|Current Program]]

## Summary

- Completed: ${latestCompleted?.completed ? 'yes' : 'no'}
- Workout: ${latestCompleted?.workoutName ?? lifts[0]?.workoutName ?? 'not logged'}

## Lifts

${lifts.length ? lifts.map(lift => `- **${lift.liftName}** (${lift.prescription}): ${lift.value || 'not entered'}`).join('\n') : '- No lift weights logged'}
`;
}
