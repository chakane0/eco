// ABOUTME: Generates plain-English insights for events using OpenAI GPT-4o-mini.
// ABOUTME: Builds prompts from event data and child markets, stores insights per event.

import OpenAI from 'openai'
import { query } from './db.js'
import type { Insight, MarketCategory } from './types.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a financial analyst grounded in Austrian and Chicago economic principles.

Format your response EXACTLY like this, using these section headers and bullet points:

**Signal**
- One bullet summarizing what prediction markets are pricing and what it means

**Why It May Happen**
- Reason 1 with a reference link
- Reason 2 with a reference link
- Reason 3 with a reference link

**Why It May Not**
- Reason 1 with a reference link
- Reason 2 with a reference link
- Reason 3 with a reference link

**Who Should Watch**
- One bullet listing who should pay attention

Rules:
- Keep total response under 200 words
- Every reason MUST include a reference URL in markdown format [text](url)
- Use real, authoritative sources (government sites, major publications, academic institutions)
- Do not give financial advice. Use phrases like "may want to consider" and "could be worth watching"
- Apply Austrian lens (dispersed knowledge, entrepreneurial discovery, malinvestment) and Chicago lens (efficient markets, rational expectations, empirical evidence)`

interface EventRow {
  event_ticker: string
  title: string
  category: MarketCategory
  total_volume: string
  is_mutually_exclusive: boolean
  market_count: number
}

interface MarketRow {
  kalshi_id: string
  title: string
  current_price: string
  volume: string
}

function buildEventPrompt(event: EventRow, markets: MarketRow[]): string {
  const topMarkets = markets.slice(0, 5).map(m => {
    const prob = Math.round(parseFloat(m.current_price) * 100)
    return `  - ${m.title}: ${prob}%`
  }).join('\n')

  const eventType = event.is_mutually_exclusive
    ? 'This is a mutually exclusive event (only one outcome can happen).'
    : 'This is a threshold-based event (multiple outcomes can be true).'

  return `Given this prediction market event:
- Event: ${event.title}
- Category: ${event.category}
- Total volume: ${parseFloat(event.total_volume).toFixed(0)} contracts
- ${eventType}
- Top markets:
${topMarkets}

Write a 2-3 sentence insight that:
1. Summarizes what the markets are signaling
2. Explains what this means for everyday decisions
3. Specifies who should pay attention`
}

export async function generateEventInsight(eventTicker: string): Promise<Insight> {
  const eventResult = await query<EventRow>(
    'SELECT * FROM events WHERE event_ticker = $1',
    [eventTicker]
  )

  if (eventResult.rows.length === 0) {
    throw new Error(`Event not found: ${eventTicker}`)
  }

  const event = eventResult.rows[0]

  const marketsResult = await query<MarketRow>(
    'SELECT kalshi_id, title, current_price, volume FROM markets WHERE event_ticker = $1 ORDER BY volume DESC',
    [eventTicker]
  )

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildEventPrompt(event, marketsResult.rows) },
    ],
    max_completion_tokens: 8192,
  })

  const text = (response.choices[0].message.content ?? '').trim()

  const insight: Insight = {
    eventTicker,
    text,
    generatedAt: new Date(),
  }

  await query(
    `INSERT INTO insights (event_ticker, text, generated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_ticker) DO UPDATE SET text = $2, generated_at = $3`,
    [insight.eventTicker, insight.text, insight.generatedAt]
  )

  return insight
}

export async function generateTopEventInsights(limit: number = 20): Promise<Insight[]> {
  const result = await query<{ event_ticker: string }>(
    'SELECT event_ticker FROM events ORDER BY total_volume DESC LIMIT $1',
    [limit]
  )

  const insights: Insight[] = []

  for (const row of result.rows) {
    try {
      const insight = await generateEventInsight(row.event_ticker)
      insights.push(insight)
    } catch (err) {
      console.error(`Failed to generate insight for ${row.event_ticker}:`, err)
    }
  }

  console.log(`Generated ${insights.length} insights for top ${limit} events`)
  return insights
}
