// ABOUTME: Modal that displays child markets for a selected event.
// ABOUTME: Shows each market's title, probability, and volume.

import { useState, useEffect } from 'react'
import { fetchEventMarkets, type EventWithInsight, type Market } from './api'
import styles from './EventModal.module.css'

interface Props {
  event: EventWithInsight
  onClose: () => void
}

export function EventModal({ event, onClose }: Props) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEventMarkets(event.eventTicker)
      .then(setMarkets)
      .catch(err => console.error('Failed to fetch markets:', err))
      .finally(() => setLoading(false))
  }, [event.eventTicker])

  function formatVolume(vol: number): string {
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`
    return vol.toFixed(0)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{event.title}</h2>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>

        <div className={styles.meta}>
          <span>${formatVolume(event.totalVolume)} total volume</span>
          <span>{event.marketCount} markets</span>
          {event.isMutuallyExclusive && (
            <span className={styles.badge}>Pick one</span>
          )}
        </div>

        {loading && <p className={styles.loading}>Loading markets...</p>}

        {!loading && markets.length > 0 && (
          <>
            <div className={styles.columnHeader}>
              <span>Market</span>
              <div className={styles.marketStats}>
                <span className={styles.volume}>Volume</span>
                <span className={styles.probability}>Probability</span>
              </div>
            </div>
            <ul className={styles.marketList}>
              {markets.map(market => (
                <li key={market.kalshiId} className={styles.marketItem}>
                  <span className={styles.marketTitle}>{market.title}</span>
                  <div className={styles.marketStats}>
                    <span className={styles.volume}>{formatVolume(market.volume)}</span>
                    <span className={styles.probability}>
                      {Math.round(market.currentPrice * 100)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
