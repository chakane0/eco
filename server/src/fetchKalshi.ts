// ABOUTME: Fetches active events and markets from Kalshi's public API.
// ABOUTME: Syncs top 5 events by volume per category, using prior volume data to prioritize.

import { query } from './db.js'
import { mapKalshiCategory } from './categorizeKalshi.js'
import type { MarketCategory, KalshiEvent } from './types.js'

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2'
const MAX_EVENT_PAGES = 50
const EVENTS_PER_CATEGORY = 5
const MAX_RETRIES = 3

interface KalshiApiEvent {
  event_ticker: string
  category: string
  title: string
  mutually_exclusive: boolean
}

interface KalshiApiMarket {
  ticker: string
  title: string
  yes_bid_dollars: string
  yes_ask_dollars: string
  last_price_dollars: string
  volume_fp: string
  previous_price_dollars: string
  status: string
}

interface KalshiEventsResponse {
  events: KalshiApiEvent[]
  cursor: string
}

interface KalshiMarketsResponse {
  markets: KalshiApiMarket[]
  cursor: string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchMatchingEvents(): Promise<KalshiApiEvent[]> {
  const matched: KalshiApiEvent[] = []
  let cursor = ''

  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const url = new URL(`${KALSHI_API_BASE}/events`)
    url.searchParams.set('status', 'open')
    url.searchParams.set('limit', '100')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Kalshi events API returned ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as KalshiEventsResponse

    for (const event of data.events) {
      matched.push(event)
    }

    console.log(`Fetched events page ${page + 1}, ${matched.length} matching events so far`)
    cursor = data.cursor
    if (!cursor) break
    await delay(200)
  }

  return matched
}

async function fetchMarketsForEvent(eventTicker: string): Promise<KalshiApiMarket[]> {
  const url = new URL(`${KALSHI_API_BASE}/markets`)
  url.searchParams.set('event_ticker', eventTicker)
  url.searchParams.set('status', 'open')
  url.searchParams.set('limit', '100')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url.toString())

    if (response.status === 429) {
      const backoff = Math.pow(2, attempt) * 1000
      console.warn(`Rate limited fetching ${eventTicker}, retrying in ${backoff}ms...`)
      await delay(backoff)
      continue
    }

    if (!response.ok) {
      throw new Error(`Kalshi markets API returned ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as KalshiMarketsResponse
    return data.markets
  }

  throw new Error(`Kalshi markets API rate limited after ${MAX_RETRIES} retries for ${eventTicker}`)
}

async function getKnownVolumes(eventTickers: string[]): Promise<Map<string, number>> {
  if (eventTickers.length === 0) return new Map()

  const placeholders = eventTickers.map((_, i) => `$${i + 1}`).join(', ')
  const result = await query<{ event_ticker: string; total_volume: string }>(
    `SELECT event_ticker, total_volume FROM events WHERE event_ticker IN (${placeholders})`,
    eventTickers
  )

  const volumes = new Map<string, number>()
  for (const row of result.rows) {
    volumes.set(row.event_ticker, parseFloat(row.total_volume))
  }
  return volumes
}

function selectTopPerCategory(
  apiEvents: KalshiApiEvent[],
  knownVolumes: Map<string, number>,
): KalshiApiEvent[] {
  const byCategory = new Map<MarketCategory, KalshiApiEvent[]>()

  for (const event of apiEvents) {
    const category = mapKalshiCategory(event.category)
    const list = byCategory.get(category) ?? []
    list.push(event)
    byCategory.set(category, list)
  }

  const selected: KalshiApiEvent[] = []

  for (const [category, events] of byCategory) {
    events.sort((a, b) => {
      const volA = knownVolumes.get(a.event_ticker) ?? 0
      const volB = knownVolumes.get(b.event_ticker) ?? 0
      return volB - volA
    })

    const top = events.slice(0, EVENTS_PER_CATEGORY)
    selected.push(...top)
    console.log(`Category "${category}": ${events.length} events, syncing top ${top.length}`)
  }

  return selected
}

async function upsertEvent(
  eventTicker: string,
  title: string,
  category: MarketCategory,
  totalVolume: number,
  isMutuallyExclusive: boolean,
  marketCount: number
): Promise<void> {
  await query(
    `INSERT INTO events (event_ticker, title, category, total_volume, is_mutually_exclusive, market_count, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (event_ticker) DO UPDATE SET
       title = $2,
       total_volume = $4,
       is_mutually_exclusive = $5,
       market_count = $6,
       last_updated = NOW()`,
    [eventTicker, title, category, totalVolume, isMutuallyExclusive, marketCount]
  )
}

async function upsertMarket(
  kalshiId: string,
  eventTicker: string,
  title: string,
  price: number,
  volume: number
): Promise<void> {
  await query(
    `INSERT INTO markets (kalshi_id, event_ticker, title, current_price, previous_price, volume, last_updated)
     VALUES ($1, $2, $3, $4, $4, $5, NOW())
     ON CONFLICT (kalshi_id) DO UPDATE SET
       previous_price = markets.current_price,
       current_price = $4,
       volume = $5,
       title = $3,
       last_updated = NOW()`,
    [kalshiId, eventTicker, title, price, volume]
  )
}

export async function fetchAndSyncMarkets(): Promise<KalshiEvent[]> {
  const apiEvents = await fetchMatchingEvents()

  const allTickers = apiEvents.map(e => e.event_ticker)
  const knownVolumes = await getKnownVolumes(allTickers)
  const selected = selectTopPerCategory(apiEvents, knownVolumes)

  console.log(`Syncing ${selected.length} events (top ${EVENTS_PER_CATEGORY} per category)`)

  const syncedEvents: KalshiEvent[] = []

  for (const apiEvent of selected) {
    try {
      const category = mapKalshiCategory(apiEvent.category)
      const markets = await fetchMarketsForEvent(apiEvent.event_ticker)

      // Insert event first (with 0 volume) so markets can reference it
      await upsertEvent(
        apiEvent.event_ticker,
        apiEvent.title,
        category,
        0,
        apiEvent.mutually_exclusive ?? false,
        markets.length
      )

      let totalVolume = 0

      for (const market of markets) {
        const price = Math.max(0, Math.min(1, parseFloat(market.last_price_dollars) || 0))
        const volume = Math.max(0, parseFloat(market.volume_fp) || 0)
        const title = (market.title ?? '').slice(0, 500)

        if (!market.ticker || !title) continue

        totalVolume += volume

        try {
          await upsertMarket(market.ticker, apiEvent.event_ticker, title, price, volume)
        } catch (err) {
          console.warn(`Skipping market ${market.ticker}:`, err)
        }
      }

      // Update event with real total volume
      await upsertEvent(
        apiEvent.event_ticker,
        apiEvent.title,
        category,
        totalVolume,
        apiEvent.mutually_exclusive ?? false,
        markets.length
      )

      syncedEvents.push({
        eventTicker: apiEvent.event_ticker,
        title: apiEvent.title,
        category,
        totalVolume,
        isMutuallyExclusive: apiEvent.mutually_exclusive ?? false,
        marketCount: markets.length,
        lastUpdated: new Date(),
      })

      await delay(500)
    } catch (err) {
      console.warn(`Skipping event ${apiEvent.event_ticker}:`, err)
    }
  }

  console.log(`Synced ${syncedEvents.length} events`)
  return syncedEvents
}
