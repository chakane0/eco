// ABOUTME: Main dashboard displaying categorized event cards with auto-refresh.
// ABOUTME: Includes category tabs, loading states, and error handling.

import { useState, useEffect, useCallback } from 'react'
import { fetchEvents, type MarketCategory, type EventWithInsight } from './api'
import { EventCard } from './EventCard'
import styles from './Styles/Dashboard.module.css'

const CATEGORIES: { label: string; value: MarketCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Economics', value: 'economics' },
  { label: 'Politics', value: 'politics' },
  { label: 'Financials', value: 'financials' },
  { label: 'Climate', value: 'climate' },
]

const REFRESH_INTERVAL = 5 * 60 * 1000

export function Dashboard() {
  const [events, setEvents] = useState<EventWithInsight[]>([])
  const [activeTab, setActiveTab] = useState<MarketCategory | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      setError(null)
      const category = activeTab === 'all' ? undefined : activeTab
      const data = await fetchEvents(category)
      setEvents(data)
    } catch (err) {
      setError('Unable to load market data. Please try again later.')
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    setLoading(true)
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const interval = setInterval(loadEvents, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadEvents])

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
      {!loading && !error && events.length === 0 && (
        <p className={styles.message}>No events found for this category.</p>
      )}
      {!loading && !error && events.map(event => (
        <EventCard key={event.eventTicker} event={event} />
      ))}
    </div>
  )
}
