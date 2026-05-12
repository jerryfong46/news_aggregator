'use client';

import { useState, useEffect, useCallback } from 'react';

interface DashboardData {
  date: { iso: string; display: string; weekday: string; weekdayIndex: number; isOfficeDay: boolean };
  reset: { attempt: number; day: number; total: number };
  joey: { weight: string };
  weather: { temp: string; feelsLike: string; desc: string; precip: string; icon: string } | null;
  workout: { name: string; anchor: string; isRest: boolean };
  transit: { show: boolean; toUnion: string[]; toRichmondHill: string[] };
  portuguese: { sessionNumber: number | null; sessionTitle: string; isRest: boolean; stories: string[]; weekKey: string; weekAnchor: string };
  digest: { date: string; totalTweets: number; newsArticles: number; sections: { heading: string; emoji: string; items: string[] }[] } | null;
  openItems: { overdue: string[]; dueThisWeek: string[]; p0s: string[]; daycareCount: number } | null;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function SectionLabel({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="section-label">
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}

function Chip({ children, color = 'default' }: { children: React.ReactNode; color?: 'red' | 'amber' | 'green' | 'blue' | 'default' }) {
  return <span className={`chip chip-${color}`}>{children}</span>;
}

function DigestSection({ section, index }: { section: { heading: string; emoji: string; items: string[] }; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="digest-section">
      <button className="digest-toggle" onClick={() => setOpen(o => !o)}>
        <span>{section.emoji} {section.heading}</span>
        <span className="digest-count">{section.items.length} items {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="digest-items">
          {section.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[(.*?)\]\(.*?\)/g, '<a href="#" class="digest-link">$1</a>') }} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        setData(await res.json());
        setLastRefresh(new Date());
      }
    } catch {/* silent */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading your day…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading">
        <p style={{ color: '#ef4444' }}>Failed to load dashboard.</p>
        <button className="btn-refresh" onClick={load}>Retry</button>
      </div>
    );
  }

  const { date, reset, joey, weather, workout, transit, portuguese, digest, openItems } = data;
  const overdueCount = (openItems?.overdue.length ?? 0) + (openItems?.p0s.length ?? 0);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div>
            <div className="header-date">{date.display}</div>
            <div className="header-meta">
              <Chip color="blue">Reset Attempt {reset.attempt} · Day {reset.day}/{reset.total}</Chip>
              <Chip>👶 Joey {joey.weight}</Chip>
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
        {weather && (
          <div className="weather-desc">{weather.desc}{weather.precip !== '0.0mm' ? ` · 🌧 ${weather.precip}` : ''}</div>
        )}
        <button className="btn-refresh-sm" onClick={load}>
          ↻ {lastRefresh ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'refresh'}
        </button>
      </header>

      <main className="main">
        {/* Overdue alert */}
        {overdueCount > 0 && (
          <Card className="alert-card">
            <div className="alert-row">
              <span className="alert-icon">⚠️</span>
              <span>{overdueCount} overdue or P0 item{overdueCount > 1 ? 's' : ''} — see This Week below</span>
            </div>
          </Card>
        )}

        {/* Commute — Tue/Thu only */}
        {transit.show && (
          <Card>
            <SectionLabel emoji="🚆" label="Commute — Richmond Hill ↔ Union" />
            <div className="transit-grid">
              <div>
                <div className="transit-dir">→ Union</div>
                {transit.toUnion.map(t => <div key={t} className="transit-time">{t}</div>)}
              </div>
              <div>
                <div className="transit-dir">← Richmond Hill</div>
                {transit.toRichmondHill.map(t => <div key={t} className="transit-time">{t}</div>)}
              </div>
            </div>
          </Card>
        )}

        {/* Today */}
        <Card>
          <SectionLabel emoji="⚡" label="Today" />

          <div className="today-row">
            <div className="today-label">🏋️ Workout</div>
            <div className={workout.isRest ? 'today-value muted' : 'today-value'}>
              {workout.name}{workout.isRest ? ' — office day' : ' · phone-free'}
            </div>
          </div>

          <div className="today-row">
            <div className="today-label">🇧🇷 Portuguese</div>
            <div className={portuguese.isRest ? 'today-value muted' : 'today-value'}>
              {portuguese.sessionTitle}
            </div>
          </div>

          {!portuguese.isRest && (
            <div className="pt-checklist">
              <label><input type="checkbox" /> CI intake · 30 min</label>
              <label><input type="checkbox" /> SR review · 5 min</label>
              {portuguese.stories.map(s => (
                <label key={s}><input type="checkbox" /> Read aloud · <em>{s}</em></label>
              ))}
            </div>
          )}

          <div className="today-row" style={{ marginTop: '12px' }}>
            <div className="today-label">🧘 Reset</div>
            <div className="today-value muted">Attempt {reset.attempt} · Day {reset.day}</div>
          </div>
          <div className="pt-checklist">
            <label><input type="checkbox" /> No phone · first 90 min</label>
            <label><input type="checkbox" /> Sunlight · ≥ 10 min</label>
            <label><input type="checkbox" /> Meditation · 10 min</label>
            <label><input type="checkbox" /> Evening log</label>
          </div>
        </Card>

        {/* This Week */}
        {openItems && (overdueCount > 0 || openItems.dueThisWeek.length > 0 || openItems.daycareCount > 0) && (
          <Card>
            <SectionLabel emoji="🎯" label="This Week" />

            {openItems.p0s.length > 0 && (
              <div className="items-group">
                <div className="items-group-label red">⚠️ Open P0s</div>
                {openItems.p0s.map((item, i) => <div key={i} className="item-row item-p0">{item}</div>)}
              </div>
            )}

            {openItems.overdue.length > 0 && (
              <div className="items-group">
                <div className="items-group-label red">🔴 Overdue</div>
                {openItems.overdue.map((item, i) => <div key={i} className="item-row item-overdue">{item}</div>)}
              </div>
            )}

            {openItems.dueThisWeek.length > 0 && (
              <div className="items-group">
                <div className="items-group-label amber">📅 Due this week</div>
                {openItems.dueThisWeek.map((item, i) => <div key={i} className="item-row item-due">{item}</div>)}
              </div>
            )}

            {openItems.daycareCount > 0 && (
              <div className="item-row item-info">🏫 {openItems.daycareCount} daycare items open</div>
            )}
          </Card>
        )}

        {/* Digest */}
        {digest && (
          <Card>
            <SectionLabel emoji="📰" label={`Digest — ${digest.date}`} />
            <div className="digest-meta">
              {digest.totalTweets} tweets · {digest.newsArticles} headlines
            </div>
            {digest.sections.map((section, i) => (
              <DigestSection key={i} section={section} index={i} />
            ))}
          </Card>
        )}

        {!digest && (
          <Card>
            <SectionLabel emoji="📰" label="Digest" />
            <p className="muted" style={{ padding: '8px 0' }}>No digest yet for today.</p>
          </Card>
        )}
      </main>

      <footer className="footer">
        Built for Jerry
      </footer>
    </div>
  );
}
