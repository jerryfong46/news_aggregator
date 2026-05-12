'use client';

import { useCallback, useEffect, useState } from 'react';

type Tab = 'today' | 'workout' | 'portuguese' | 'digest' | 'week';

interface Exercise { name: string; prescription: string }
interface SessionTask { title: string; minutes: string; details: string[] }
interface CueCardData { front: string; back: string; tag: string }
interface StoryData { title: string; englishTitle: string; newVocab: string; rows: { pt: string; en: string }[]; questions: string[] }
interface FrequencyEntry { rank: number; word: string; meaning: string; status: string; notes: string; known: boolean }
interface FrequencyData { baselineKnownCount: number; knownCount: number; nextWords: FrequencyEntry[]; entries: FrequencyEntry[]; rankByWord: Record<string, number>; knownByWord: Record<string, boolean> }
type CardRating = 'again' | 'hard' | 'easy';
interface CardProgress { rating: CardRating; reviewedAt: string; learned?: boolean }
type ProgressMap = Record<string, CardProgress>;
interface WorkoutEntry { completed?: boolean; lifts: Record<string, string> }
type WorkoutLog = Record<string, WorkoutEntry>;

interface DashboardData {
  date: { iso: string; display: string; weekday: string; weekdayIndex: number; isOfficeDay: boolean };
  reset: { attempt: number; day: number; total: number };
  joey: { weight: string };
  weather: { temp: string; high: string; feelsLike: string; desc: string; precip: string; icon: string } | null;
  workout: { name: string; anchor: string; isRest: boolean; duration: string; template: string[]; exercises: Exercise[]; progression: string[] };
  transit: { show: boolean; toUnion: string[]; toRichmondHill: string[] };
  portuguese: {
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
    cueCards: CueCardData[];
    frequency: FrequencyData;
  };
  digest: { date: string; totalTweets: number; newsArticles: number; sections: { heading: string; emoji: string; items: string[] }[] } | null;
  openItems: { overdue: string[]; dueThisWeek: string[]; p0s: string[]; daycareCount: number } | null;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-label">
      <span>{eyebrow}</span>
      <strong>{title}</strong>
    </div>
  );
}

function Chip({ children, color = 'default' }: { children: React.ReactNode; color?: 'red' | 'amber' | 'green' | 'blue' | 'default' }) {
  return <span className={`chip chip-${color}`}>{children}</span>;
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return <label className="check-row"><input type="checkbox" /> <span>{children}</span></label>;
}

function cardId(card: CueCardData) {
  return `${card.tag}:${card.front}`;
}

function normalizeFrequencyTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isGrammarPracticeTask(task: SessionTask) {
  return /production|mixed cloze|weak-point drill|mini-probe/i.test(task.title);
}

function cardFrequencyRank(card: CueCardData, frequency: FrequencyData) {
  return frequency.rankByWord[normalizeFrequencyTerm(card.front)] ?? Number.POSITIVE_INFINITY;
}

function isKnownFrequencyCard(card: CueCardData, frequency: FrequencyData) {
  const key = normalizeFrequencyTerm(card.front);
  return Boolean(frequency.knownByWord[key] || (frequency.rankByWord[key] !== undefined && frequency.rankByWord[key] <= frequency.baselineKnownCount));
}

function postProgressEvent(event: object) {
  fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {
    // Local storage remains the immediate source of truth if network sync fails.
  });
}

function CueCard({
  card,
  progress,
  onRate,
}: {
  card: CueCardData;
  progress?: CardProgress;
  onRate: (card: CueCardData, rating: CardRating) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const status = progress?.rating === 'easy' ? 'Learned' : progress?.rating === 'hard' ? 'Hard' : progress?.rating === 'again' ? 'Again' : 'New';
  return (
    <div className={`cue-card ${flipped ? 'is-flipped' : ''}`}>
      <button className="cue-flip" onClick={() => setFlipped(v => !v)} type="button">
        <span className="cue-card-inner">
        <span className="cue-face cue-front">
          <small>{card.tag} · {status}</small>
          <strong>{card.front}</strong>
          <em>Tap to reveal</em>
        </span>
        <span className="cue-face cue-back">
          <small>Answer</small>
          <strong>{card.back}</strong>
          <em>Rate below</em>
        </span>
        </span>
      </button>
      {flipped && (
        <div className="rating-row">
          <button type="button" onClick={() => onRate(card, 'again')}>Again</button>
          <button type="button" onClick={() => onRate(card, 'hard')}>Hard</button>
          <button type="button" onClick={() => onRate(card, 'easy')}>Easy</button>
        </div>
      )}
    </div>
  );
}

function PTDailyProgress({
  cardsReviewedToday, totalCards,
  storiesReadToday, totalStories,
  grammarDone, masteredTotal,
  onToggleGrammar,
}: {
  cardsReviewedToday: number; totalCards: number;
  storiesReadToday: number; totalStories: number;
  grammarDone: boolean; masteredTotal: number;
  onToggleGrammar: () => void;
}) {
  const cardsDone = totalCards > 0 && cardsReviewedToday >= totalCards;
  const storiesDone = totalStories > 0 && storiesReadToday >= totalStories;
  return (
    <div className="pt-daily-bar">
      <div className={`pt-daily-tile${cardsDone ? ' done' : cardsReviewedToday > 0 ? ' partial' : ''}`}>
        <span>Cards</span>
        <strong>{cardsReviewedToday}/{totalCards}</strong>
        <small>{cardsDone ? '✓ done' : 'reviewed'}</small>
      </div>
      <div className={`pt-daily-tile${storiesDone ? ' done' : storiesReadToday > 0 ? ' partial' : ''}`}>
        <span>Stories</span>
        <strong>{storiesReadToday}/{totalStories}</strong>
        <small>{storiesDone ? '✓ done' : 'read'}</small>
      </div>
      <button type="button" className={`pt-daily-tile${grammarDone ? ' done' : ''}`} onClick={onToggleGrammar}>
        <span>Grammar</span>
        <strong>{grammarDone ? '✓' : '—'}</strong>
        <small>{grammarDone ? 'done' : 'tap to log'}</small>
      </button>
      <div className="pt-daily-tile pt-daily-mastered">
        <span>Mastered</span>
        <strong>{masteredTotal}</strong>
        <small>all time</small>
      </div>
    </div>
  );
}

function StoryPanel({ story, onOpen }: { story: StoryData; onOpen?: () => void }) {
  return (
    <details className="story-panel" onToggle={(e) => { if (e.currentTarget.open) onOpen?.(); }}>
      <summary>
        <span>{story.title}</span>
        {story.englishTitle && <em>{story.englishTitle}</em>}
      </summary>
      {story.newVocab && <p className="story-vocab">New vocab: {story.newVocab}</p>}
      {story.rows.length > 0 ? (
        <div className="story-lines">
          {story.rows.map((row, index) => (
            <div className="story-line" key={`${story.title}-${index}`}>
              <strong>{row.pt}</strong>
              <span>{row.en}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Full story text will load after the vault is available through GITHUB_PAT.</p>
      )}
      {story.questions.length > 0 && (
        <div className="story-questions">
          <strong>Self-check</strong>
          {story.questions.map(question => <span key={question}>{question}</span>)}
        </div>
      )}
    </details>
  );
}

function DigestSection({ section, index }: { section: { heading: string; emoji: string; items: string[] }; index: number }) {
  const [open, setOpen] = useState(index < 2);
  return (
    <div className="digest-section">
      <button className="digest-toggle" onClick={() => setOpen(o => !o)} type="button">
        <span>{section.emoji} {section.heading}</span>
        <span className="digest-count">{section.items.length} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="digest-items">
          {section.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[(.*?)\]\(.*?\)/g, '<span class="digest-link">$1</span>') }} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [storyReadsToday, setStoryReadsToday] = useState<Set<string>>(new Set());
  const [grammarDone, setGrammarDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        setData(await res.json());
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      setProgress(JSON.parse(localStorage.getItem('pt-card-progress') ?? '{}'));
      setWorkoutLog(JSON.parse(localStorage.getItem('workout-log') ?? '{}'));
      setStoryReadsToday(new Set(JSON.parse(localStorage.getItem(`pt-stories-${today}`) ?? '[]')));
      setGrammarDone(localStorage.getItem(`pt-grammar-${today}`) === '1');
    } catch {
      setProgress({});
      setWorkoutLog({});
    }
  }, []);

  const rateCard = useCallback((card: CueCardData, rating: CardRating) => {
    const timestamp = new Date().toISOString();
    const learned = rating === 'easy' || progress[cardId(card)]?.learned || false;
    setProgress(current => {
      const next = {
        ...current,
        [cardId(card)]: {
          rating,
          reviewedAt: timestamp,
          learned: rating === 'easy' || current[cardId(card)]?.learned,
        },
      };
      localStorage.setItem('pt-card-progress', JSON.stringify(next));
      return next;
    });
    postProgressEvent({
      type: 'pt_card_review',
      date: new Date().toLocaleDateString('en-CA'),
      timestamp,
      cardId: cardId(card),
      front: card.front,
      back: card.back,
      tag: card.tag,
      rating,
      learned,
    });
  }, [progress]);

  const updateWorkout = useCallback((iso: string, updater: (entry: WorkoutEntry) => WorkoutEntry) => {
    setWorkoutLog(current => {
      const next = {
        ...current,
        [iso]: updater(current[iso] ?? { lifts: {} }),
      };
      localStorage.setItem('workout-log', JSON.stringify(next));
      return next;
    });
  }, []);

  const syncWorkoutCompleted = useCallback((iso: string, workoutName: string, completed: boolean) => {
    postProgressEvent({
      type: 'workout_completed',
      date: iso,
      timestamp: new Date().toISOString(),
      workoutName,
      completed,
    });
  }, []);

  const syncWorkoutLift = useCallback((iso: string, workoutName: string, exercise: Exercise, value: string) => {
    postProgressEvent({
      type: 'workout_lift',
      date: iso,
      timestamp: new Date().toISOString(),
      workoutName,
      liftName: exercise.name,
      prescription: exercise.prescription,
      value,
    });
  }, []);

  const markStoryRead = useCallback((title: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    setStoryReadsToday(current => {
      const next = new Set(current);
      next.add(title);
      localStorage.setItem(`pt-stories-${today}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const toggleGrammar = useCallback(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setGrammarDone(current => {
      const next = !current;
      localStorage.setItem(`pt-grammar-${today}`, next ? '1' : '0');
      return next;
    });
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Loading dashboard...</p></div>;
  }

  if (!data) {
    return <div className="loading"><p className="error">Failed to load dashboard.</p><button className="btn-refresh" onClick={load}>Retry</button></div>;
  }

  const { date, reset, joey, weather, workout, transit, portuguese, digest, openItems } = data;
  const overdueCount = (openItems?.overdue.length ?? 0) + (openItems?.p0s.length ?? 0);
  const todayIso = new Date().toLocaleDateString('en-CA');
  const frequency = portuguese.frequency;
  const baselineKnownCount = frequency?.baselineKnownCount ?? 100;
  const vocabCards = portuguese.cueCards.filter(card => card.tag === 'Vocab');
  const baselineKnownWords = new Set((frequency?.entries ?? []).filter(entry => entry.known).flatMap(entry => (
    entry.word.split('/').flatMap(part => part.split(',')).map(piece => normalizeFrequencyTerm(piece))
  )).filter(Boolean));
  const vocabProgressEntries = Object.entries(progress).filter(([id]) => id.startsWith('Vocab:'));
  const novelProgressEntries = vocabProgressEntries.filter(([id]) => {
    const front = id.slice('Vocab:'.length);
    const key = normalizeFrequencyTerm(front);
    return !baselineKnownWords.has(key);
  });
  const learnedWords = baselineKnownCount + novelProgressEntries.length;
  const masteredWords = baselineKnownCount + novelProgressEntries.filter(([, value]) => value.learned || value.rating === 'easy').length;
  const learnedToday = novelProgressEntries.filter(([, value]) => value.reviewedAt?.startsWith(todayIso)).length;
  const learnedNovelCards = vocabCards
    .filter(card => (progress[cardId(card)]?.learned || progress[cardId(card)]?.rating === 'easy') && !isKnownFrequencyCard(card, frequency))
    .sort((a, b) => cardFrequencyRank(a, frequency) - cardFrequencyRank(b, frequency) || a.front.localeCompare(b.front));
  const hardCards = portuguese.cueCards
    .filter(card => ['again', 'hard'].includes(progress[cardId(card)]?.rating ?? ''))
    .filter(card => card.tag !== 'Vocab' || !isKnownFrequencyCard(card, frequency))
    .sort((a, b) => cardFrequencyRank(a, frequency) - cardFrequencyRank(b, frequency));
  const sortedVocabCards = vocabCards
    .filter(card => !isKnownFrequencyCard(card, frequency))
    .sort((a, b) => cardFrequencyRank(a, frequency) - cardFrequencyRank(b, frequency) || a.front.localeCompare(b.front));
  const newWordCards = sortedVocabCards.filter(card => !progress[cardId(card)]?.learned && !hardCards.some(hard => cardId(hard) === cardId(card))).slice(0, 10);
  const supportCards = portuguese.cueCards.filter(card => card.tag !== 'Vocab' && !hardCards.some(hard => cardId(hard) === cardId(card)));
  const reviewCards = [...hardCards, ...newWordCards, ...supportCards];
  const reviewCardsReviewedToday = reviewCards.filter(card => progress[cardId(card)]?.reviewedAt?.startsWith(todayIso)).length;
  const grammarPracticeTasks = portuguese.sessionTasks.filter(isGrammarPracticeTask);
  const frequencyNextWords = (frequency?.nextWords ?? []).slice(0, 12);
  const todaysWorkout = workoutLog[date.iso] ?? { lifts: {} };
  const workoutWeek = [
    ['Mon', 'Push A'],
    ['Tue', 'Rest'],
    ['Wed', 'Pull A'],
    ['Thu', 'Rest'],
    ['Fri', 'Legs'],
    ['Sat', 'Push B'],
    ['Sun', 'Pull B'],
  ];
  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'workout', label: 'Workout' },
    { id: 'portuguese', label: 'PT' },
    { id: 'digest', label: 'Digest' },
    { id: 'week', label: 'Week' },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div>
            <div className="header-date">{date.display}</div>
            <div className="header-meta">
              <Chip color="blue">Reset {reset.attempt} · Day {reset.day}/{reset.total}</Chip>
              <Chip>Joey {joey.weight}</Chip>
              {overdueCount > 0 && <Chip color="red">{overdueCount} P0/overdue</Chip>}
            </div>
          </div>
          {weather && (
            <div className="weather-badge">
              <span className="weather-icon">{weather.icon}</span>
              <div>
                <div className="weather-temp">{weather.temp}</div>
                <div className="weather-feels">{weather.feelsLike}{weather.high ? ` · ${weather.high}` : ''}</div>
              </div>
            </div>
          )}
        </div>
        <div className="header-subline">
          <span>{weather ? `${weather.desc}${weather.precip !== '0.0mm' ? ` · ${weather.precip}` : ''}` : 'Weather unavailable'}</span>
          <button className="btn-refresh-sm" onClick={load} type="button">
            {lastRefresh ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'refresh'}
          </button>
        </div>
        <nav className="tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={activeTab === tab.id ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab.id)} type="button">
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {activeTab === 'today' && (
          <>
            <Card className="hero-card">
              <SectionLabel eyebrow="Now" title="Today" />
              <div className="hero-grid">
                <button className="hero-tile" onClick={() => setActiveTab('workout')} type="button">
                  <span>Workout</span>
                  <strong>{workout.name}</strong>
                  <em>{workout.isRest ? 'Office rest day' : workout.duration}</em>
                </button>
                <button className="hero-tile" onClick={() => setActiveTab('portuguese')} type="button">
                  <span>Portuguese</span>
                  <strong>{portuguese.sessionTitle}</strong>
                  <em>{learnedWords} learned · {masteredWords} mastered</em>
                </button>
              </div>
            </Card>

            {transit.show && (
              <Card>
                <SectionLabel eyebrow="Office" title="Commute" />
                <div className="transit-grid">
                  <div><div className="transit-dir">To Union</div>{transit.toUnion.map(t => <div key={t} className="transit-time">{t}</div>)}</div>
                  <div><div className="transit-dir">To Richmond Hill</div>{transit.toRichmondHill.map(t => <div key={t} className="transit-time">{t}</div>)}</div>
                </div>
              </Card>
            )}

            <Card>
              <SectionLabel eyebrow="Reset" title={`Attempt ${reset.attempt} · Day ${reset.day}`} />
              <div className="check-list">
                <CheckRow>No phone · first 90 min</CheckRow>
                <CheckRow>Sunlight · at least 10 min</CheckRow>
                <CheckRow>Meditation · 10 min</CheckRow>
                <CheckRow>Phone-free walk · post-lunch 20 min</CheckRow>
                <CheckRow>Evening log</CheckRow>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'workout' && (
          <>
            <Card className="hero-card">
              <SectionLabel eyebrow={workout.duration} title={workout.name} />
              {workout.isRest ? (
                <p className="muted">Office rest day. No workout decision needed.</p>
              ) : (
                <>
                  <label className="complete-row">
                    <input
                      type="checkbox"
                      checked={!!todaysWorkout.completed}
                      onChange={event => {
                        updateWorkout(date.iso, entry => ({ ...entry, completed: event.target.checked }));
                        syncWorkoutCompleted(date.iso, workout.name, event.target.checked);
                      }}
                    />
                    <span>{todaysWorkout.completed ? 'Workout completed' : 'Mark workout complete'}</span>
                  </label>
                  <div className="exercise-list">
                    {workout.exercises.map((exercise, index) => (
                      <div className="exercise-row exercise-track-row" key={`${exercise.name}-${index}`}>
                        <span>{index + 1}</span>
                        <div>
                          <strong>{exercise.name}</strong>
                          <em>{exercise.prescription}</em>
                          <input
                            className="lift-input"
                            value={todaysWorkout.lifts[exercise.name] ?? ''}
                            onChange={event => updateWorkout(date.iso, entry => ({
                              ...entry,
                              lifts: { ...entry.lifts, [exercise.name]: event.target.value },
                            }))}
                            onBlur={event => syncWorkoutLift(date.iso, workout.name, exercise, event.target.value)}
                            placeholder="e.g. 185 x 6, 185 x 5, 175 x 6"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
            <Card>
              <SectionLabel eyebrow="Week" title="Workout Calendar" />
              <div className="workout-calendar">
                {workoutWeek.map(([day, name], index) => (
                  <div className={`workout-day ${date.weekdayIndex === ((index + 1) % 7) ? 'active' : ''} ${name === 'Rest' ? 'rest' : ''}`} key={day}>
                    <span>{day}</span>
                    <strong>{name}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'portuguese' && (
          <>
            <Card className="hero-card">
              <SectionLabel eyebrow={portuguese.weekKey} title={portuguese.sessionTitle} />
              {portuguese.lessonStatus !== 'current' && (
                <p className="notice">Current week plan is missing. Showing latest available lesson content.</p>
              )}
              {portuguese.weekTarget && <p className="lead">{portuguese.weekTarget}</p>}
              <PTDailyProgress
                cardsReviewedToday={reviewCardsReviewedToday}
                totalCards={reviewCards.length}
                storiesReadToday={storyReadsToday.size}
                totalStories={portuguese.stories.length}
                grammarDone={grammarDone}
                masteredTotal={masteredWords}
                onToggleGrammar={toggleGrammar}
              />
            </Card>

            <Card>
              <SectionLabel eyebrow="Frequency" title="Known baseline" />
              <p className="lead">Top 100 frequency words are treated as known already. New review starts at rank 101.</p>
              <div className="kpi-grid pt-kpis">
                <div><span>Baseline</span><strong>{baselineKnownCount}</strong></div>
                <div><span>Learned</span><strong>{learnedWords}</strong></div>
                <div><span>Mastered</span><strong>{masteredWords}</strong></div>
              </div>
              <div className="pt-word-group">
                <div className="pt-word-group-label">Learned on this device</div>
                {learnedNovelCards.length > 0 ? (
                  <div className="chip-row">
                    {learnedNovelCards.map(card => {
                      const rank = cardFrequencyRank(card, frequency);
                      return (
                        <Chip key={cardId(card)} color="green">
                          {Number.isFinite(rank) ? `${rank}. ` : ''}{card.front}
                        </Chip>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">No new learned words logged yet on this device.</p>
                )}
              </div>
              {frequencyNextWords.length > 0 && (
                <div className="chip-row">
                  {frequencyNextWords.map(word => (
                    <Chip key={`${word.rank}-${word.word}`} color={word.rank <= baselineKnownCount ? 'green' : 'amber'}>
                      {word.rank}. {word.word}
                    </Chip>
                  ))}
                </div>
              )}
            </Card>

            {grammarPracticeTasks.length > 0 && (
              <Card>
                <SectionLabel eyebrow="Practice" title="Grammar Worksheet" />
                <div className="task-stack">
                  {grammarPracticeTasks.map(task => (
                    <div className="task-card" key={task.title}>
                      <div className="task-heading"><strong>{task.title}</strong>{task.minutes && <span>{task.minutes}</span>}</div>
                      <ul>{task.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionLabel eyebrow="Review" title="Cue Cards" />
              <div className="kpi-grid">
                <div><span>Learned</span><strong>{learnedWords}</strong></div>
                <div><span>New today</span><strong>{learnedToday}/10</strong></div>
                <div><span>Hard queue</span><strong>{hardCards.length}</strong></div>
              </div>
              {portuguese.cueCards.length > 0 ? (
                <div className="cue-grid">{reviewCards.map(card => <CueCard card={card} progress={progress[cardId(card)]} onRate={rateCard} key={`${card.tag}-${card.front}`} />)}</div>
              ) : (
                <p className="muted">No lesson cue cards available yet. Run the weekly prep to create this week's plan.</p>
              )}
            </Card>

            <Card>
              <SectionLabel eyebrow="Daily" title="Anchors" />
              <div className="check-list">
                {portuguese.dailyAnchors.map(anchor => <CheckRow key={anchor}>{anchor}</CheckRow>)}
              </div>
            </Card>

            <Card>
              <SectionLabel eyebrow="Read" title="Weekly Stories" />
              <div className="story-stack">
                {portuguese.stories.map(story => <StoryPanel story={story} key={story.title} onOpen={() => markStoryRead(story.title)} />)}
              </div>
            </Card>

            {portuguese.successCriteria.length > 0 && (
              <Card>
                <SectionLabel eyebrow="Target" title="Success Criteria" />
                <ul className="plain-list">{portuguese.successCriteria.map(item => <li key={item}>{item}</li>)}</ul>
              </Card>
            )}
          </>
        )}

        {activeTab === 'digest' && (
          <Card>
            <SectionLabel eyebrow="News" title={digest ? `Digest · ${digest.date}` : 'Digest'} />
            {digest ? (
              <>
                <div className="digest-meta">{digest.totalTweets} tweets · {digest.newsArticles} headlines</div>
                {digest.sections.map((section, i) => <DigestSection key={section.heading} section={section} index={i} />)}
              </>
            ) : (
              <p className="muted">No digest yet for today.</p>
            )}
          </Card>
        )}

        {activeTab === 'week' && (
          <Card>
            <SectionLabel eyebrow="Open" title="This Week" />
            {!openItems && <p className="muted">Dashboard items unavailable until GITHUB_PAT is configured.</p>}
            {openItems?.p0s.map(item => <div key={item} className="item-row item-p0">{item}</div>)}
            {openItems?.overdue.map(item => <div key={item} className="item-row item-overdue">{item}</div>)}
            {openItems?.dueThisWeek.map(item => <div key={item} className="item-row item-due">{item}</div>)}
            {!!openItems?.daycareCount && <div className="item-row item-info">{openItems.daycareCount} daycare items open</div>}
            {openItems && overdueCount === 0 && openItems.dueThisWeek.length === 0 && <p className="muted">All clear this week.</p>}
          </Card>
        )}
      </main>
    </div>
  );
}
