// ABOUTME: Maps Kalshi event categories to internal market categories.
// ABOUTME: Uses Kalshi's own category field instead of keyword matching on titles.

import type { MarketCategory } from './types.js'

const KALSHI_CATEGORY_MAP: Record<string, MarketCategory> = {
  'Economics': 'economics',
  'Financials': 'financials',
  'Companies': 'financials',
  'Politics': 'politics',
  'Elections': 'politics',
  'Climate and Weather': 'climate',
}

export function mapKalshiCategory(kalshiCategory: string): MarketCategory | null {
  return KALSHI_CATEGORY_MAP[kalshiCategory] ?? null
}
