// ABOUTME: Main dashboard displaying categorized event cards with auto-refresh.
// ABOUTME: Includes dynamic category tabs, loading states, error handling, and event detail modal.

import { useState, useEffect, useCallback } from 'react'
import { fetchEvents, fetchCategories, type EventWithInsight } from './api'
import { EventCard } from './EventCard'
import { EventModal } from './EventModal'
import styles from './Styles/Dashboard.module.css'

const REFRESH_INTERVAL = 5 * 60 * 1000

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function Dashboard() {
  const [events, setEvents] = useState<EventWithInsight[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventWithInsight | null>(null)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to fetch categories:', err))
  }, [])

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

  function handleInsightGenerated(eventTicker: string, insight: string) {
    setEvents(prev => prev.map(e =>
      e.eventTicker === eventTicker ? { ...e, insight } : e
    ))
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Trendwise</h1>
      <p className={styles.subtitle}>
        Prediction market insights for everyday decisions
      </p>

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('all')}
          className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
          >
            {capitalize(cat)}
          </button>
        ))}
      </div>

      {loading && <p className={styles.message}>Loading markets...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className={styles.message}>No events found for this category.</p>
      )}
      {!loading && !error && events.map(event => (
        <EventCard
          key={event.eventTicker}
          event={event}
          onClick={() => setSelectedEvent(event)}
          onInsightGenerated={handleInsightGenerated}
        />
      ))}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
