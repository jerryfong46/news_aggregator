export interface WeatherData {
  temp: string;
  high: string;
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
  sourceDate?: string;
  isFallback?: boolean;
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
  stories: StoryData[];
  weekKey: string;
  weekAnchor: string;
  lessonStatus: 'current' | 'fallback' | 'missing';
  weekTarget: string;
  successCriteria: string[];
  dailyAnchors: string[];
  sessionTasks: SessionTask[];
  cueCards: CueCard[];
  frequency: FrequencyData;
}

export interface FrequencyEntry {
  rank: number;
  word: string;
  meaning: string;
  status: string;
  notes: string;
  known: boolean;
}

export interface FrequencyData {
  baselineKnownCount: number;
  knownCount: number;
  nextWords: FrequencyEntry[];
  entries: FrequencyEntry[];
  rankByWord: Record<string, number>;
  knownByWord: Record<string, boolean>;
}

export interface WorkoutData {
  name: string;
  anchor: string;
  isRest: boolean;
  duration?: string;
  template?: string[];
  exercises?: Exercise[];
  progression?: string[];
}

export interface Exercise {
  name: string;
  prescription: string;
}

export interface SessionTask {
  title: string;
  minutes: string;
  details: string[];
}

export interface CueCard {
  front: string;
  back: string;
  tag: string;
}

export interface StoryData {
  title: string;
  englishTitle: string;
  newVocab: string;
  rows: StoryRow[];
  questions: string[];
}

export interface StoryRow {
  pt: string;
  en: string;
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

const STATIC_WORKOUTS: Record<string, Exercise[]> = {
  'Push A': [
    { name: 'Bench press', prescription: '3 x 4-6' },
    { name: 'Overhead press or incline DB press', prescription: '3 x 6-10' },
    { name: 'Triceps: weighted dip or cable pushdown', prescription: '2-3 x 8-12' },
  ],
  'Pull A': [
    { name: 'Weighted pull-up or chin-up', prescription: '3 x 4-8' },
    { name: 'Chest-supported row or cable row', prescription: '3 x 6-10' },
    { name: 'Face pull or biceps curl', prescription: '2-3 x 10-15' },
  ],
  Legs: [
    { name: 'Leg extension', prescription: '3 x 8-12' },
    { name: 'Bulgarian split squat or reverse lunge', prescription: '3 x 8-12 per leg' },
    { name: 'Dumbbell or cable deadlift', prescription: '2-3 x 8-10' },
    { name: 'Optional calf raise', prescription: '2 x 12-15' },
  ],
  'Push B': [
    { name: 'Incline DB press or weighted dip', prescription: '3 x 6-8' },
    { name: 'Overhead press: standing or seated DB', prescription: '3 x 6-10' },
    { name: 'Lateral raise or triceps extension', prescription: '2-3 x 10-15' },
  ],
  'Pull B': [
    { name: 'Barbell or dumbbell row', prescription: '3 x 6-10' },
    { name: 'Lat pulldown or assisted pull-up', prescription: '3 x 8-12' },
    { name: 'Hammer curl or EZ-bar curl', prescription: '2-3 x 10-15' },
  ],
};

const DEFAULT_WORKOUT_PROGRESSION = [
  'First 2 weeks: stay conservative and nail the pattern',
  'When all sets hit the top of the rep range, add weight next time',
  'Poor sleep or bad recovery: keep the load, cut to minimum sets',
  'Missed days: do not double up; continue with the next scheduled day',
];

export function getWorkout(weekdayIndex: number): WorkoutData {
  return WORKOUT_MAP[weekdayIndex] ?? { name: 'REST', anchor: '', isRest: true };
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function normalizeFrequencyTerm(value: string): string {
  return stripMarkdown(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}

function extractListItems(markdown: string): string[] {
  return markdown
    .split('\n')
    .map(line => line.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, '').trim())
    .filter(line => line.length > 0 && !line.startsWith('|') && !line.startsWith('#'))
    .map(stripMarkdown);
}

export function parseFrequencyMasterList(content: string | null): FrequencyData {
  const baselineKnownCount = 100;
  if (!content) {
    return { baselineKnownCount, knownCount: baselineKnownCount, nextWords: [], entries: [], rankByWord: {}, knownByWord: {} };
  }

  const entries: FrequencyEntry[] = [];
  content.split('\n').forEach(line => {
    const cells = line.split('|').map(cell => stripMarkdown(cell)).filter(Boolean);
    if (cells.length < 4) return;
    const rank = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rank)) return;

    const word = cells[1] ?? '';
    const meaning = cells[2] ?? '';
    const status = cells[3] ?? '';
    const notes = cells[4] ?? '';
    const known = rank <= baselineKnownCount || /✅|📖/.test(status);
    entries.push({ rank, word, meaning, status, notes, known });
  });

  entries.sort((a, b) => a.rank - b.rank);

  const rankByWord: Record<string, number> = {};
  const knownByWord: Record<string, boolean> = {};
  entries.forEach(entry => {
    entry.word.split('/').forEach(part => {
      part.split(',').forEach(piece => {
        const key = normalizeFrequencyTerm(piece);
        if (key && rankByWord[key] === undefined) {
          rankByWord[key] = entry.rank;
        }
        if (key && entry.known) {
          knownByWord[key] = true;
        }
      });
    });
  });

  const knownCount = entries.filter(entry => entry.known).length;
  const nextWords = entries.filter(entry => !entry.known).slice(0, 24);

  return { baselineKnownCount, knownCount, nextWords, entries, rankByWord, knownByWord };
}

export function enrichWorkout(workout: WorkoutData, programContent: string | null): WorkoutData {
  const fallbackTemplate = [
    '3-5 min warm-up',
    '10-12 min main lift',
    '10-12 min on 2 assistance movements',
    'Stop at 20-30 min',
    'Leave 1-2 reps in reserve',
  ];

  if (!programContent || workout.isRest) {
    return {
      ...workout,
      duration: workout.isRest ? 'Office rest day' : '20-30 min',
      template: workout.isRest ? ['No lifting decision needed today', 'Keep the reset anchors intact'] : fallbackTemplate,
      exercises: STATIC_WORKOUTS[workout.name] ?? [],
      progression: workout.isRest ? [] : DEFAULT_WORKOUT_PROGRESSION,
    };
  }

  const section = workout.anchor ? extractSection(programContent, workout.anchor) : '';
  const exercises = extractListItems(section).map(item => {
    const [name, ...rest] = item.split(' — ');
    return { name: name.trim(), prescription: rest.join(' — ').trim() };
  });

  return {
    ...workout,
    duration: '20-30 min',
    template: extractListItems(extractSection(programContent, 'Session Template')).slice(0, 5),
    exercises,
    progression: extractListItems(extractSection(programContent, 'Progression')).slice(0, 4),
  };
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

const DEFAULT_DAILY_ANCHORS = [
  'CI Intake — 30 min/day: podcast, music, BR show, or YouTube',
  'SR — 5 min/day: clear due cards only',
  'Extensive reading — 10 min/day of parallel-text stories',
  'Shadowing — 5 min/day during the post-lunch walk',
];

const DEFAULT_PT_TASKS: Record<number, SessionTask[]> = {
  1: [
    { title: 'Comprehensible Input', minutes: '10 min', details: ['Watch or listen once for meaning', 'Second pass: write down words or patterns you notice'] },
    { title: 'Pattern Extraction', minutes: '10 min', details: ['Extract the rule from real examples before reading grammar', 'Say each example aloud'] },
    { title: 'Production', minutes: '10 min', details: ['Answer prompts aloud before checking', 'Log misses to the error log'] },
  ],
  2: [
    { title: 'Deep SR Review', minutes: '10 min', details: ['Clear all due cards first', 'Review aloud, not silently', 'Mark repeated failures as leeches'] },
    { title: 'Chunk Drilling', minutes: '15 min', details: ['Drill five phrase chunks front to back', 'Say the whole chunk as one unit'] },
    { title: 'Error-Log Review', minutes: '5 min', details: ['Review recurring errors before output day'] },
  ],
  3: [
    { title: 'Warm-up', minutes: '5 min', details: ['Start with a short spoken prompt'] },
    { title: 'Free Conversation', minutes: '20 min', details: ['Portuguese only as much as possible', 'Ask for corrections in real time'] },
    { title: 'Error Capture', minutes: '5 min', details: ['Ask for a list of mistakes and save them'] },
  ],
  4: [
    { title: 'Mixed Cloze', minutes: '10 min', details: ['Mix the last three weeks instead of blocking one topic'] },
    { title: 'Weak-Point Drill', minutes: '10 min', details: ['Drill known errors directly'] },
    { title: 'Mini-Probe', minutes: '10 min', details: ['Speak or write 5-6 sentences and score accuracy'] },
  ],
};

const DEFAULT_CUE_CARDS: CueCard[] = [
  { front: 'Me chamo...', back: 'My name is...', tag: 'Intro' },
  { front: 'Sou canadense.', back: "I'm Canadian. Drop eu unless needed.", tag: 'Intro' },
  { front: 'Moro em Markham.', back: 'I live in Markham. Use morar for residence.', tag: 'Verb' },
  { front: 'Tudo bem?', back: 'How are you? / Everything good?', tag: 'Phrase' },
  { front: 'Tudo ótimo. E você?', back: 'Everything great. And you?', tag: 'Phrase' },
  { front: 'converso com Joey', back: 'I talk with Joey.', tag: 'Chunk' },
  { front: 'andamos no parque', back: 'We walk in the park.', tag: 'Chunk' },
  { front: 'ela canta baixinho', back: 'She sings softly.', tag: 'Chunk' },
  { front: 'procuramos a chave', back: 'We look for the key.', tag: 'Chunk' },
  { front: 'explico devagar', back: 'I explain slowly.', tag: 'Chunk' },
];

const DEFAULT_STORY_TITLES = [
  'O Patinho Feio',
  'Pinóquio e a Luz',
  'A Pequena Sereia',
  'Branca de Neve',
  'Rapunzel na Torre',
  'Rute e Noemi',
  'Zaqueu na Árvore',
  'Jesus Acalma a Tempestade',
  'O Filho Perdido',
  'Ester e o Rei',
];

function emptyStory(title: string): StoryData {
  return { title, englishTitle: '', newVocab: '', rows: [], questions: [] };
}

function getSessionSection(lessonContent: string, sessionNumber: number | null): string {
  if (!lessonContent || !sessionNumber) return '';
  const lines = lessonContent.split('\n');
  const start = lines.findIndex(line => line.startsWith(`## Session ${sessionNumber}`));
  if (start === -1) return '';
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n').trim();
}

function parseSessionTasks(sessionContent: string): SessionTask[] {
  const lines = sessionContent.split('\n');
  const headingIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^### \d+\./.test(line));

  return headingIndexes.map(({ line, index }, headingIndex) => {
    const next = headingIndexes[headingIndex + 1]?.index ?? lines.length;
    const title = stripMarkdown(line.replace(/^### \d+\.\s*/, ''));
    const minutes = title.match(/\(([^)]+min)\)/i)?.[1] ?? '';
    const details = extractListItems(lines.slice(index + 1, next).join('\n')).slice(0, 8);
    return { title: title.replace(/\s*\([^)]+min\)/i, ''), minutes, details };
  });
}

function parseCueCards(sessionContent: string, frequency: FrequencyData | null = null): CueCard[] {
  const vocabCards: CueCard[] = [];
  const chunkCards: CueCard[] = [];
  const clozeCards: CueCard[] = [];
  const wordTranslations: Record<string, string> = {};
  const frequencyMeaningByWord: Record<string, string> = {};
  frequency?.entries.forEach(entry => {
    entry.word.split('/').forEach(part => {
      part.split(',').forEach(piece => {
        const key = normalizeFrequencyTerm(piece);
        if (key && !frequencyMeaningByWord[key]) {
          frequencyMeaningByWord[key] = entry.meaning;
        }
      });
    });
  });

  // Parse chunk table first so we can cross-reference vocab
  const sessionLines = sessionContent.split('\n');
  const chunkStart = sessionLines.findIndex(line => line.trim().startsWith('| Chunk | Meaning |'));
  const chunkLines = chunkStart === -1
    ? []
    : sessionLines.slice(chunkStart).filter(line => line.trim().startsWith('|'));
  chunkLines.forEach(line => {
    const cells = line.split('|').map(cell => stripMarkdown(cell)).filter(Boolean);
    if (cells.length === 2 && cells[0] !== 'Chunk' && !cells[0].startsWith('---')) {
      chunkCards.push({ front: cells[0], back: cells[1], tag: 'Chunk' });
      // Index individual words so vocab cards can borrow the translation
      cells[0].split(/\s+/).forEach(w => {
        const key = w.toLowerCase().replace(/[.,!?]/g, '');
        if (key && !wordTranslations[key]) wordTranslations[key] = cells[1];
      });
    }
  });

  // Parse vocab — try inline translations, then chunk cross-ref, then self-check fallback
  const vocab = sessionContent.match(/\*\*New vocab seeded this session \(\d+\):\*\*\s*([^.\n]+)\.?/);
  if (vocab) {
    vocab[1].split(',').forEach(word => {
      const clean = stripMarkdown(word.trim());
      if (!clean) return;
      const parenMatch = clean.match(/^(.+?)\s*\(([^)]+)\)$/);
      const dashMatch = clean.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      if (parenMatch) {
        vocabCards.push({ front: parenMatch[1].trim(), back: parenMatch[2].trim(), tag: 'Vocab' });
      } else if (dashMatch) {
        vocabCards.push({ front: dashMatch[1].trim(), back: dashMatch[2].trim(), tag: 'Vocab' });
      } else {
        const translation = wordTranslations[clean.toLowerCase()] ?? frequencyMeaningByWord[normalizeFrequencyTerm(clean)];
        vocabCards.push({ front: clean, back: translation ?? 'Recall the meaning aloud.', tag: 'Vocab' });
      }
    });
  }

  // Parse cloze
  Array.from(sessionContent.matchAll(/^\d+\.\s+(.+?)→\s*(.+)$/gm)).forEach(match => {
    clozeCards.push({ front: stripMarkdown(match[1]), back: stripMarkdown(match[2]), tag: 'Cloze' });
  });

  return [...vocabCards, ...chunkCards, ...clozeCards].slice(0, 24);
}

export function parsePTData(
  weekdayIndex: number,
  weekKey: string,
  lessonContent: string | null,
  lessonStatus: 'current' | 'fallback' | 'missing' = 'current',
  methodContent: string | null = null,
  frequencyContent: string | null = null,
): PortugueseData {
  const session = PT_SESSION_MAP[weekdayIndex] ?? PT_SESSION_MAP[5];

  // Extract stories
  let storyTitles: string[] = [];
  if (lessonContent) {
    const storiesSection = lessonContent.match(/## This Week's Stories[\s\S]*?(?=##|$)/)?.[0] ?? '';
    storyTitles = Array.from(storiesSection.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => {
      const parts = m[1].split('|');
      return parts[parts.length - 1].replace('Stories/', '').trim();
    });
  }

  // Week anchor for session link
  const sessionNum = session.number;
  const weekAnchor = sessionNum && lessonContent
    ? (lessonContent.match(new RegExp(`#+ (Session ${sessionNum}[^\\n]+)`))?.[1] ?? '')
    : '';
  const weekTarget = lessonContent
    ? stripMarkdown(lessonContent.match(/## Week Target\s*\n+([\s\S]*?)(?=\n## )/)?.[1]?.split('\n').find(line => line.trim().length > 0) ?? '')
    : '';
  const successCriteria = lessonContent
    ? extractListItems(lessonContent.match(/\*\*Success criteria by Thu:\*\*([\s\S]*?)(?=\n## |\n### )/)?.[1] ?? '').slice(0, 4)
    : [];
  const sessionContent = getSessionSection(lessonContent ?? '', session.number);
  const methodAnchors = methodContent?.match(/\*\*Daily anchors[\s\S]*?(?=\n\n\*\*Weekly card budget)/)?.[0] ?? '';
  const dailyAnchors = extractListItems(methodAnchors).slice(0, 4);
  const sessionTasks = parseSessionTasks(sessionContent);
  const frequency = parseFrequencyMasterList(frequencyContent);
  const cueCards = parseCueCards(sessionContent, frequency);

  return {
    sessionNumber: session.number,
    sessionTitle: session.title,
    isRest: session.isRest,
    stories: (storyTitles.length > 0 ? storyTitles : DEFAULT_STORY_TITLES).map(emptyStory),
    weekKey,
    weekAnchor,
    lessonStatus,
    weekTarget,
    successCriteria,
    dailyAnchors: dailyAnchors.length > 0 ? dailyAnchors : DEFAULT_DAILY_ANCHORS,
    sessionTasks: session.number && sessionTasks.length > 0 ? sessionTasks : session.number ? DEFAULT_PT_TASKS[session.number] ?? [] : [],
    cueCards: cueCards.length > 0 ? cueCards : DEFAULT_CUE_CARDS,
    frequency,
  };
}

export function parseStoryMarkdown(title: string, content: string | null): StoryData {
  if (!content) return emptyStory(title);

  const lines = content.split('\n');
  const englishTitle = lines.find((line, index) => index > 0 && line.startsWith('# '))?.replace(/^#\s+/, '').trim() ?? '';
  const newVocab = stripMarkdown(content.match(/New vocab:\s*(.+)$/m)?.[1] ?? '');
  const rows: StoryRow[] = [];
  const questions: string[] = [];

  for (const line of lines) {
    if (line.startsWith('| ') && !line.includes('---') && !line.includes('Português')) {
      const cells = line.split('|').map(cell => stripMarkdown(cell)).filter(Boolean);
      if (cells.length >= 2 && cells[0]) rows.push({ pt: cells[0], en: cells[1] });
    }

    const question = line.match(/^\d+\.\s+(.+)$/)?.[1];
    if (question) questions.push(stripMarkdown(question));
  }

  return { title, englishTitle, newVocab, rows, questions };
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch('https://wttr.in/Richmond+Hill+Ontario?format=j1', {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    const today = data.weather?.[0];
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
      high: today?.maxtempC ? `high ${today.maxtempC}°C` : '',
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
