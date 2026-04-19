// ABOUTME: Express route handlers for the REST API.
// ABOUTME: Serves event data with insights and manages email subscriptions.

import { Router } from 'express'
import { query } from './db.js'
import { EmailSchema, type MarketCategory, type EventWithInsight } from './types.js'

export const router = Router()

// GET /api/events?category=:category
router.get('/events', async (req, res) => {
  try {
    const category = req.query.category as string | undefined
    const validCategories = ['economics', 'politics', 'climate', 'financials']

    let sql = `
      SELECT e.*, i.text as insight_text
      FROM events e
      LEFT JOIN insights i ON e.event_ticker = i.event_ticker
    `
    const params: unknown[] = []

    if (category && validCategories.includes(category)) {
      sql += ' WHERE e.category = $1'
      params.push(category)
    }

    sql += ' ORDER BY e.total_volume DESC LIMIT 20'

    const result = await query<{
      event_ticker: string
      title: string
      category: MarketCategory
      total_volume: string
      is_mutually_exclusive: boolean
      market_count: number
      last_updated: Date
      insight_text: string | null
    }>(sql, params)

    const events: EventWithInsight[] = result.rows.map(row => ({
      eventTicker: row.event_ticker,
      title: row.title,
      category: row.category,
      totalVolume: parseFloat(row.total_volume),
      isMutuallyExclusive: row.is_mutually_exclusive,
      marketCount: row.market_count,
      lastUpdated: row.last_updated.toISOString(),
      insight: row.insight_text,
    }))

    res.json({ events })
  } catch (err) {
    console.error('Error fetching events:', err)
    res.status(503).json({ error: 'Service temporarily unavailable' })
  }
})

// POST /api/subscribers
router.post('/subscribers', async (req, res) => {
  try {
    const { email } = req.body

    const parsed = EmailSchema.safeParse(email)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email address' })
      return
    }

    const existing = await query<{ active: boolean }>(
      'SELECT active FROM subscribers WHERE email = $1',
      [parsed.data]
    )

    if (existing.rows.length > 0) {
      if (!existing.rows[0].active) {
        await query('UPDATE subscribers SET active = true WHERE email = $1', [parsed.data])
      }
      res.status(201).json({ message: 'Subscribed successfully' })
      return
    }

    await query(
      'INSERT INTO subscribers (email, subscribed_at, active) VALUES ($1, NOW(), true)',
      [parsed.data]
    )
    res.status(201).json({ message: 'Subscribed successfully' })
  } catch (err) {
    console.error('Error adding subscriber:', err)
    res.status(503).json({ error: 'Service temporarily unavailable' })
  }
})

// DELETE /api/subscribers/:email
router.delete('/subscribers/:email', async (req, res) => {
  try {
    const { email } = req.params
    await query('UPDATE subscribers SET active = false WHERE email = $1', [email])
    res.json({ message: 'Unsubscribed successfully' })
  } catch (err) {
    console.error('Error removing subscriber:', err)
    res.status(503).json({ error: 'Service temporarily unavailable' })
  }
})
