// ABOUTME: Renders a single prediction market event as a clickable card.
// ABOUTME: Shows event title, total volume, market count, AI insight, and generate button.

import { useState } from 'react'
import type { EventWithInsight } from './api'
import { generateInsight } from './api'
import { InsightText } from './InsightText'
import styles from './EventCard.module.css'

interface Props {
  event: EventWithInsight
  onClick: () => void
  onInsightGenerated: (eventTicker: string, insight: string) => void
}

export function EventCard({ event, onClick, onInsightGenerated }: Props) {
  const [generating, setGenerating] = useState(false)

  const volume = event.totalVolume >= 1000
    ? `${(event.totalVolume / 1000).toFixed(1)}k`
    : event.totalVolume.toFixed(0)

  async function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation()
    setGenerating(true)
    try {
      const insight = await generateInsight(event.eventTicker)
      onInsightGenerated(event.eventTicker, insight)
    } catch (err) {
      console.error('Failed to generate insight:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.cardContent}>
        <div className={styles.cardLeft}>
          <h3 className={styles.title}>{event.title}</h3>
          <div className={styles.meta}>
            <span className={styles.volume}>${volume} market volume</span>
            <span className={styles.markets}>{event.marketCount} markets</span>
            {event.isMutuallyExclusive && (
              <span className={styles.badge}>Pick one</span>
            )}
          </div>
          {event.insight && (
            <InsightText text={event.insight} />
          )}
        </div>
        <button
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={generating}
          title="Generate AI insight"
        >
          {generating ? '...' : '✨'}
        </button>
      </div>
    </div>
  )
}
