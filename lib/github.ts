const REPO = 'jerryfong46/obsidian-vault';
const BASE = 'https://api.github.com';

async function githubFetch(path: string): Promise<string | null> {
  const token = process.env.GITHUB_PAT;
  if (!token) return null;

  const res = await fetch(`${BASE}/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3.raw',
    },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) return null;
  return res.text();
}

export async function fetchDigest(date: string): Promise<string | null> {
  return githubFetch(`Journal/Digest/${date}.md`);
}

export async function fetchDashboard(): Promise<string | null> {
  return githubFetch('Journal/Dashboard.md');
}

export async function fetchWeeklyLesson(weekKey: string): Promise<string | null> {
  return githubFetch(`Resources/Portuguese/Weekly Lessons/${weekKey}.md`);
}
