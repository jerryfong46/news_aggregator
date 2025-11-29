'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface TwitterHandle {
  id: string;
  handle: string;
  addedAt: number;
}

interface ScrapedTweet {
  content: string;
  timestamp: string;
  handle: string;
}

interface DailySummary {
  date: string;
  summary: string;
  hacks: string[];
  airdrops: string[];
  marketSentiment: string;
  tweets: ScrapedTweet[];
  createdAt: number;
}

export default function Home() {
  const [handles, setHandles] = useState<TwitterHandle[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHandles();
    fetchSummaries();
  }, []);

  const fetchHandles = async () => {
    try {
      const res = await fetch('/api/handles');
      const data = await res.json();
      setHandles(data.handles || []);
    } catch (err) {
      console.error('Failed to fetch handles:', err);
    }
  };

  const fetchSummaries = async () => {
    try {
      const res = await fetch('/api/summaries');
      const data = await res.json();
      setSummaries(data.summaries || []);
    } catch (err) {
      console.error('Failed to fetch summaries:', err);
    }
  };

  const addHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newHandle.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add handle');
      }

      setNewHandle('');
      await fetchHandles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add handle');
    } finally {
      setLoading(false);
    }
  };

  const removeHandle = async (id: string) => {
    try {
      await fetch(`/api/handles?id=${id}`, { method: 'DELETE' });
      await fetchHandles();
    } catch (err) {
      console.error('Failed to remove handle:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Twitter Monitor & Summarizer</h1>
        <p className={styles.description}>
          Track crypto Twitter accounts and get AI-powered daily summaries
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Monitored Accounts</h2>
            <form onSubmit={addHandle} className={styles.form}>
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="Enter Twitter handle"
                className={styles.input}
                disabled={loading}
              />
              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? 'Adding...' : 'Add Handle'}
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.handleList}>
              {handles.length === 0 ? (
                <p className={styles.emptyState}>No handles added yet</p>
              ) : (
                handles.map((handle) => (
                  <div key={handle.id} className={styles.handleItem}>
                    <span>@{handle.handle}</span>
                    <button
                      onClick={() => removeHandle(handle.id)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2>Recent Summaries</h2>
            {summaries.length === 0 ? (
              <p className={styles.emptyState}>
                No summaries yet. Add some handles and wait for the daily scrape!
              </p>
            ) : (
              <div className={styles.summaryList}>
                {summaries.map((summary) => (
                  <div key={summary.date} className={styles.summaryItem}>
                    <h3>{formatDate(summary.date)}</h3>
                    <div className={styles.summaryContent}>
                      <p>{summary.summary}</p>

                      {summary.hacks.length > 0 && (
                        <div className={styles.section}>
                          <h4>🚨 Security Alerts</h4>
                          <ul>
                            {summary.hacks.map((hack, i) => (
                              <li key={i}>{hack}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {summary.airdrops.length > 0 && (
                        <div className={styles.section}>
                          <h4>🎁 Airdrops</h4>
                          <ul>
                            {summary.airdrops.map((airdrop, i) => (
                              <li key={i}>{airdrop}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className={styles.section}>
                        <h4>📊 Market Sentiment</h4>
                        <p>{summary.marketSentiment}</p>
                      </div>

                      <p className={styles.tweetCount}>
                        Based on {summary.tweets.length} tweets
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
