// ABOUTME: Main dashboard displaying categorized market cards with auto-refresh.
// ABOUTME: Includes category tabs, loading states, and error handling.

import { useState, useEffect, useCallback } from 'react';
import { fetchMarkets, type MarketCategory, type MarketWithInsight } from './api';
import { MarketCard } from './MarketCard';
import styles from '../src/Styles/Dashboard.module.css';

const CATEGORIES: { label: string; value: MarketCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Economy', value: 'economy' },
  { label: 'Politics', value: 'politics' },
  { label: 'Energy', value: 'energy' },
  { label: 'Climate', value: 'climate' },
];

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function Dashboard() {
  const [markets, setMarkets] = useState<MarketWithInsight[]>([]);
  const [activeTab, setActiveTab] = useState<MarketCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      setError(null);
      const category = activeTab === 'all' ? undefined : activeTab;
      const data = await fetchMarkets(category);
      setMarkets(data);
    } catch (err) {
      setError('Unable to load market data. Please try again later.');
      console.error('Failed to fetch markets:', err);
    } finally {
      setLoading(false)
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    const interval = setInterval(loadMarkets, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMarkets]);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Trendwise</h1>
      <p className={styles.subtitle}>
        Prediction market insights for everyday decisions
      </p>

      <div className={styles.tabs}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveTab(cat.value)}
            className={`${styles.tab} ${activeTab === cat.value ? styles.tabActive : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && <p className={styles.message}>Loading markets...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {!loading && !error && markets.length === 0 && (
        <p className={styles.message}>No markets found for this category.</p>
      )}
      {!loading && !error && markets.map(market => (
        <MarketCard key={market.kalshiId} market={market} />
      ))}
    </div>
  )
}
