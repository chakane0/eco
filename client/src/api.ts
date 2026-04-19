// ABOUTME: Typed API client for communicating with the Express backend.
// ABOUTME: Handles event fetching and subscriber management.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export type MarketCategory = 'economics' | 'politics' | 'climate' | 'financials'

export interface EventWithInsight {
  eventTicker: string
  title: string
  category: MarketCategory
  totalVolume: number
  isMutuallyExclusive: boolean
  marketCount: number
  lastUpdated: string
  insight: string | null
}

interface EventsResponse {
  events: EventWithInsight[]
}

export async function fetchEvents(category?: MarketCategory): Promise<EventWithInsight[]> {
  const url = new URL(`${API_BASE}/events`)
  if (category) url.searchParams.set('category', category)

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data: EventsResponse = await response.json()
  return data.events
}

export async function subscribe(email: string): Promise<void> {
  const response = await fetch(`${API_BASE}/subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Subscription failed')
  }
}
