// ABOUTME: Typed API client for communicating with the Express backend.
// ABOUTME: Handles market fetching and subscriber management.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export type MarketCategory = 'economy' | 'politics' | 'energy' | 'climate'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface MarketWithInsight {
  kalshiId: string
  title: string
  category: MarketCategory
  currentPrice: number
  previousPrice: number
  trend: TrendDirection
  trendPercent: number
  lastUpdated: string
  insight: string | null
}

interface MarketsResponse {
  markets: MarketWithInsight[]
}

export async function fetchMarkets(category?: MarketCategory): Promise<MarketWithInsight[]> {
  const url = new URL(`${API_BASE}/markets`)
  if (category) url.searchParams.set('category', category)

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data: MarketsResponse = await response.json()
  return data.markets
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
