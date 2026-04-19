// ABOUTME: Renders a single prediction market event as a card.
// ABOUTME: Shows event title, total volume, market count, and AI insight.

import type { EventWithInsight } from './api'
import styles from './EventCard.module.css'

interface Props {
  event: EventWithInsight
}

export function EventCard({ event }: Props) {
  const volume = event.totalVolume >= 1000
    ? `${(event.totalVolume / 1000).toFixed(1)}k`
    : event.totalVolume.toFixed(0)

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{event.title}</h3>
      <div className={styles.meta}>
        <span className={styles.volume}>{volume} contracts</span>
        <span className={styles.markets}>{event.marketCount} markets</span>
        {event.isMutuallyExclusive && (
          <span className={styles.badge}>Pick one</span>
        )}
      </div>
      {event.insight && (
        <p className={styles.insight}>{event.insight}</p>
      )}
    </div>
  )
}
