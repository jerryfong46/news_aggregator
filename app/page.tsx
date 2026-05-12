'use client';

import { useCallback, useEffect, useState } from 'react';

type Tab = 'today' | 'workout' | 'portuguese' | 'digest' | 'week';

interface Exercise { name: string; prescription: string }
interface SessionTask { title: string; minutes: string; details: string[] }
interface CueCardData { front: string; back: string; tag: string }

interface DashboardData {
  date: { iso: string; display: string; weekday: string; weekdayIndex: number; isOfficeDay: boolean };
  reset: { attempt: number; day: number; total: number };
  joey: { weight: string };
  weather: { temp: string; feelsLike: string; desc: string; precip: string; icon: string } | null;
  workout: { name: string; anchor: string; isRest: boolean; duration: string; template: string[]; exercises: Exercise[]; progression: string[] };
  transit: { show: boolean; toUnion: string[]; toRichmondHill: string[] };
  portuguese: {
    sessionNumber: number | null;
    sessionTitle: string;
    isRest: boolean;
    stories: string[];
    weekKey: string;
    weekAnchor: string;
    lessonStatus: 'current' | 'fallback' | 'missing';
    weekTarget: string;
    successCriteria: string[];
    dailyAnchors: string[];
    sessionTasks: SessionTask[];
    cueCards: CueCardData[];
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

function CueCard({ card }: { card: CueCardData }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button className={`cue-card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(v => !v)} type="button">
      <span className="cue-card-inner">
        <span className="cue-face cue-front">
          <small>{card.tag}</small>
          <strong>{card.front}</strong>
          <em>Tap to reveal</em>
        </span>
        <span className="cue-face cue-back">
          <small>Answer</small>
          <strong>{card.back}</strong>
          <em>Tap to hide</em>
        </span>
      </span>
    </button>
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

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Loading dashboard...</p></div>;
  }

  if (!data) {
    return <div className="loading"><p className="error">Failed to load dashboard.</p><button className="btn-refresh" onClick={load}>Retry</button></div>;
  }

  const { date, reset, joey, weather, workout, transit, portuguese, digest, openItems } = data;
  const overdueCount = (openItems?.overdue.length ?? 0) + (openItems?.p0s.length ?? 0);
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
                <div className="weather-feels">{weather.feelsLike}</div>
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
                  <em>{portuguese.cueCards.length} cue cards</em>
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
                <div className="exercise-list">
                  {workout.exercises.map((exercise, index) => (
                    <div className="exercise-row" key={`${exercise.name}-${index}`}>
                      <span>{index + 1}</span>
                      <div><strong>{exercise.name}</strong><em>{exercise.prescription}</em></div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <SectionLabel eyebrow="Structure" title="Session Template" />
              <div className="check-list">{workout.template.map(item => <CheckRow key={item}>{item}</CheckRow>)}</div>
            </Card>
            {workout.progression.length > 0 && (
              <Card>
                <SectionLabel eyebrow="Rule" title="Progression" />
                <ul className="plain-list">{workout.progression.map(item => <li key={item}>{item}</li>)}</ul>
              </Card>
            )}
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
            </Card>

            {portuguese.sessionTasks.length > 0 && (
              <Card>
                <SectionLabel eyebrow="30 min" title="Session Plan" />
                <div className="task-stack">
                  {portuguese.sessionTasks.map(task => (
                    <div className="task-card" key={task.title}>
                      <div className="task-heading"><strong>{task.title}</strong>{task.minutes && <span>{task.minutes}</span>}</div>
                      <ul>{task.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionLabel eyebrow="Tap" title="Cue Cards" />
              {portuguese.cueCards.length > 0 ? (
                <div className="cue-grid">{portuguese.cueCards.map(card => <CueCard card={card} key={`${card.tag}-${card.front}`} />)}</div>
              ) : (
                <p className="muted">No lesson cue cards available yet. Run the weekly prep to create this week's plan.</p>
              )}
            </Card>

            <Card>
              <SectionLabel eyebrow="Daily" title="Anchors + Stories" />
              <div className="check-list">
                {portuguese.dailyAnchors.map(anchor => <CheckRow key={anchor}>{anchor}</CheckRow>)}
                {portuguese.stories.map(story => <CheckRow key={story}>Read aloud · {story}</CheckRow>)}
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
