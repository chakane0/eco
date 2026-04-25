// ABOUTME: Typed API client for communicating with the Express backend.
// ABOUTME: Handles event fetching and subscriber management.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export type MarketCategory = string

export interface EventWithInsight {
  eventTicker: string
  title: string
  category: string
  totalVolume: number
  isMutuallyExclusive: boolean
  marketCount: number
  lastUpdated: string
  insight: string | null
}

interface EventsResponse {
  events: EventWithInsight[]
}

export async function fetchCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/categories`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data: { categories: string[] } = await response.json()
  return data.categories
}

export async function fetchEvents(category?: string): Promise<EventWithInsight[]> {
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

export interface Market {
  kalshiId: string
  title: string
  currentPrice: number
  previousPrice: number
  volume: number
  lastUpdated: string
}

export async function fetchEventMarkets(eventTicker: string): Promise<Market[]> {
  const response = await fetch(`${API_BASE}/events/${eventTicker}/markets`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data: { markets: Market[] } = await response.json()
  return data.markets
}

export async function generateInsight(eventTicker: string): Promise<string> {
  const response = await fetch(`${API_BASE}/events/${eventTicker}/generate-insight`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data: { insight: string } = await response.json()
  return data.insight
}
