// ABOUTME: Maps Kalshi event categories to display-friendly internal categories.
// ABOUTME: Passes through all Kalshi categories, normalizing names for consistency.

const KALSHI_CATEGORY_MAP: Record<string, string> = {
  'Economics': 'economics',
  'Financials': 'financials',
  'Companies': 'companies',
  'Politics': 'politics',
  'Elections': 'elections',
  'Climate and Weather': 'climate',
  'Sports': 'sports',
  'Culture': 'culture',
  'Science': 'science',
  'Commodities': 'commodities',
  'Tech': 'tech',
  'Entertainment': 'entertainment',
  'Health': 'health',
  'Transportation': 'transportation',
  'Crypto': 'crypto',
}

export function mapKalshiCategory(kalshiCategory: string): string {
  return KALSHI_CATEGORY_MAP[kalshiCategory] ?? kalshiCategory.toLowerCase()
}
