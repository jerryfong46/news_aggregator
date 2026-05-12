export interface WeatherData {
  temp: string;
  feelsLike: string;
  desc: string;
  precip: string;
  icon: string;
}

export interface DigestData {
  date: string;
  totalTweets: number;
  newsArticles: number;
  sections: DigestSection[];
}

export interface DigestSection {
  heading: string;
  emoji: string;
  items: string[];
}

export interface PortugueseData {
  sessionNumber: number | null;
  sessionTitle: string;
  isRest: boolean;
  stories: string[];
  weekKey: string;
  weekAnchor: string;
}

export interface WorkoutData {
  name: string;
  anchor: string;
  isRest: boolean;
}

export interface OpenItems {
  overdue: string[];
  dueThisWeek: string[];
  p0s: string[];
  daycareCount: number;
}

export interface DateInfo {
  iso: string;
  display: string;
  weekday: string;
  weekdayIndex: number; // 0=Sun,1=Mon,...,6=Sat
  isOfficeDay: boolean;
}

// ISO week number
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getDateInfo(now: Date): DateInfo {
  const tz = 'America/Toronto';
  // ISO date in Toronto time
  const iso = now.toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
  const display = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
  // weekdayIndex in Toronto time
  const weekdayIndex = parseInt(now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Sun' ? '0'
    : now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Mon' ? '1'
    : now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Tue' ? '2'
    : now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Wed' ? '3'
    : now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Thu' ? '4'
    : now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }) === 'Fri' ? '5'
    : '6', 10);
  return { iso, display, weekday, weekdayIndex, isOfficeDay: weekdayIndex === 2 || weekdayIndex === 4 };
}

export function getWeekKey(now: Date): string {
  const week = getISOWeek(now);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getAttentionReset(now: Date): { attempt: number; day: number; total: number } {
  const attempt2Start = new Date('2026-05-12');
  const diff = Math.floor((now.getTime() - attempt2Start.getTime()) / 86400000);
  if (diff < 0) return { attempt: 2, day: 0, total: 30 };
  return { attempt: 2, day: Math.min(diff + 1, 30), total: 30 };
}

const WORKOUT_MAP: Record<number, WorkoutData> = {
  1: { name: 'Push A', anchor: 'Push A — Monday', isRest: false },
  2: { name: 'REST', anchor: '', isRest: true },
  3: { name: 'Pull A', anchor: 'Pull A — Wednesday', isRest: false },
  4: { name: 'REST', anchor: '', isRest: true },
  5: { name: 'Legs', anchor: 'Legs — Friday', isRest: false },
  6: { name: 'Push B', anchor: 'Push B — Saturday', isRest: false },
  0: { name: 'Pull B', anchor: 'Pull B — Sunday', isRest: false },
};

export function getWorkout(weekdayIndex: number): WorkoutData {
  return WORKOUT_MAP[weekdayIndex] ?? { name: 'REST', anchor: '', isRest: true };
}

const PT_SESSION_MAP: Record<number, { number: number | null; title: string; isRest: boolean }> = {
  1: { number: 1, title: 'Session 1 — Input', isRest: false },
  2: { number: 2, title: 'Session 2 — Deep SR + Chunking', isRest: false },
  3: { number: 3, title: 'Session 3 — Output', isRest: false },
  4: { number: 4, title: 'Session 4 — Interleaving', isRest: false },
  5: { number: null, title: 'Rest — anchors only', isRest: true },
  6: { number: null, title: 'Rest — anchors only', isRest: true },
  0: { number: null, title: 'Sunday — weekly prep', isRest: true },
};

export function parsePTData(weekdayIndex: number, weekKey: string, lessonContent: string | null): PortugueseData {
  const session = PT_SESSION_MAP[weekdayIndex] ?? PT_SESSION_MAP[5];

  // Extract stories
  const stories: string[] = [];
  if (lessonContent) {
    const storiesSection = lessonContent.match(/## This Week's Stories[\s\S]*?(?=##|$)/)?.[0] ?? '';
    const storyLinks = Array.from(storiesSection.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => {
      const parts = m[1].split('|');
      return parts[parts.length - 1].replace('Stories/', '').trim();
    });

    // Pick 2 stories using weekday rotation (Mon=0)
    const i = weekdayIndex === 0 ? 1 : (weekdayIndex === 6 ? 0 : (weekdayIndex - 1) % 5);
    const n = storyLinks.length;
    if (n > 0) {
      stories.push(storyLinks[(i * 2) % n]);
      if (n > 1) stories.push(storyLinks[(i * 2 + 1) % n]);
    }
  }

  // Week anchor for session link
  const sessionNum = session.number;
  const weekAnchor = sessionNum && lessonContent
    ? (lessonContent.match(new RegExp(`#+ (Session ${sessionNum}[^\\n]+)`))?.[1] ?? '')
    : '';

  return {
    sessionNumber: session.number,
    sessionTitle: session.title,
    isRest: session.isRest,
    stories,
    weekKey,
    weekAnchor,
  };
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch('https://wttr.in/Richmond+Hill+Ontario?format=j1', {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;

    const icons: Record<string, string> = {
      '113': '☀️', '116': '⛅', '119': '☁️', '122': '☁️',
      '176': '🌦️', '185': '🌧️', '200': '⛈️', '227': '🌨️',
      '230': '❄️', '248': '🌫️', '260': '🌫️', '263': '🌧️',
      '266': '🌧️', '281': '🌧️', '284': '🌧️', '293': '🌧️',
      '296': '🌧️', '299': '🌧️', '302': '🌧️', '305': '🌧️',
      '308': '🌧️', '311': '🌧️', '314': '🌧️', '317': '🌨️',
      '320': '🌨️', '323': '🌨️', '326': '🌨️', '329': '❄️',
      '332': '❄️', '335': '❄️', '338': '❄️', '350': '🌧️',
      '353': '🌧️', '356': '🌧️', '359': '🌧️', '362': '🌨️',
      '365': '🌨️', '368': '🌨️', '371': '❄️', '374': '🌨️',
      '377': '🌨️', '386': '⛈️', '389': '⛈️', '392': '⛈️', '395': '⛈️',
    };

    return {
      temp: `${current.temp_C}°C`,
      feelsLike: `feels ${current.FeelsLikeC}°C`,
      desc: current.weatherDesc?.[0]?.value ?? '',
      precip: `${current.precipMM}mm`,
      icon: icons[current.weatherCode] ?? '🌡️',
    };
  } catch {
    return null;
  }
}

export function parseDigest(content: string, date: string): DigestData {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string> = {};
  if (frontmatterMatch) {
    frontmatterMatch[1].split('\n').forEach(line => {
      const [k, ...v] = line.split(':');
      if (k && v.length) fm[k.trim()] = v.join(':').trim();
    });
  }

  const body = content.replace(/^---[\s\S]*?---\n/, '');
  const sections: DigestSection[] = [];

  const sectionRegex = /^## (🔴 URGENT[^\n]*|🟠 Crypto[^\n]*|🟡 AI[^\n]*|🔵 Notable[^\n]*|## [^\n]+)/gm;
  const h2Regex = /^## (.+)$/gm;

  const headings: { index: number; title: string }[] = [];
  let m;
  while ((m = h2Regex.exec(body)) !== null) {
    headings.push({ index: m.index, title: m[1] });
  }

  headings.forEach((h, i) => {
    const start = h.index + h.title.length + 4;
    const end = i + 1 < headings.length ? headings[i + 1].index : body.length;
    const sectionBody = body.slice(start, end).trim();

    const items: string[] = [];
    sectionBody.split('\n').forEach(line => {
      const stripped = line.replace(/^[-*]\s+/, '').trim();
      if (stripped && !stripped.startsWith('#') && stripped.length > 10) {
        items.push(stripped);
      }
    });

    if (items.length === 0) return;

    let emoji = '📋';
    const t = h.title;
    if (t.includes('URGENT') || t.includes('🔴')) emoji = '🔴';
    else if (t.includes('Crypto') || t.includes('🟠')) emoji = '🟠';
    else if (t.includes('AI') || t.includes('ML') || t.includes('Notable') || t.includes('🔵')) emoji = '🔵';
    else if (t.includes('🟡')) emoji = '🟡';

    sections.push({ heading: h.title.replace(/^[^\w\s]+\s*/, ''), emoji, items });
  });

  return {
    date,
    totalTweets: parseInt(fm['total_tweets'] ?? '0', 10),
    newsArticles: parseInt(fm['news_articles'] ?? '0', 10),
    sections,
  };
}

export function parseOpenItems(dashboardContent: string, todayIso: string): OpenItems {
  const overdue: string[] = [];
  const dueThisWeek: string[] = [];
  const p0s: string[] = [];
  let daycareCount = 0;

  // Get Mon–Sun for current week
  const today = new Date(todayIso);
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayIso = sunday.toISOString().split('T')[0];

  const lines = dashboardContent.split('\n');
  let inDaycareSection = false;

  for (const line of lines) {
    if (line.includes('Daycares — Todo')) { inDaycareSection = true; continue; }
    if (inDaycareSection && line.startsWith('##')) { inDaycareSection = false; }

    if (!line.match(/^- \[ \]/)) continue;
    if (line.includes('[x]')) continue;

    const text = line.replace(/^- \[ \]\s*/, '').trim();

    // Skip "Later" and structural items
    if (text.length < 5) continue;

    if (inDaycareSection) { daycareCount++; continue; }

    // Check for P0 flags
    if (text.includes('🔴') && !text.match(/By \w+ \d+/)) {
      const clean = text.replace(/\[\[.*?\]\]/g, '').replace(/\*\*/g, '').replace(/→.*$/, '').trim();
      p0s.push(clean.slice(0, 80));
      continue;
    }

    // Parse dates: "By May 1", "By Apr 28", "*(was due YYYY-MM-DD)*"
    const dueDateMatch = text.match(/\*\(was due (\d{4}-\d{2}-\d{2})\)\*/);
    const byDateMatch = text.match(/By (\w+ \d+)/);

    if (dueDateMatch) {
      const clean = text.replace(/\*\(was due.*?\)\*/, '').replace(/\[\[.*?\]\]/g, '').replace(/\*\*/g, '').trim();
      overdue.push(clean.slice(0, 80));
    } else if (byDateMatch) {
      const dateStr = byDateMatch[1] + ' 2026';
      const parsed = new Date(dateStr);
      const parsedIso = parsed.toISOString().split('T')[0];
      if (parsedIso < todayIso) {
        const clean = text.replace(/→.*$/, '').replace(/\[\[.*?\]\]/g, '').replace(/\*\*/g, '').trim();
        overdue.push(clean.slice(0, 80));
      } else if (parsedIso <= sundayIso) {
        const clean = text.replace(/→.*$/, '').replace(/\[\[.*?\]\]/g, '').replace(/\*\*/g, '').trim();
        dueThisWeek.push(`${clean.slice(0, 70)} → ${byDateMatch[1]}`);
      }
    }
  }

  return { overdue: overdue.slice(0, 5), dueThisWeek: dueThisWeek.slice(0, 4), p0s: p0s.slice(0, 3), daycareCount };
}

export function getJoeyWeight(dashboardContent: string): string {
  const m = dashboardContent.match(/Joey weight:\s*([\d.]+ kg)/);
  return m?.[1] ?? '5.345 kg';
}
