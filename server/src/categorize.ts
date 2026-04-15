/*
    Categorizes Kalshi market titles into known topic categories
    Uses keyword matching against predefined lists for economy, politics, energy, and climate
*/

import type { MarketCategory } from "./types.js";

const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
    economy: ['fed', 'rate', 'gdp', 'inflation', 'recession', 'unemployment', 'jobs', 'cpi', 'interest', 'mortgage', 'treasury', 'debt', 'deficit', 'crypto', 'currency'],
    politics: ['president', 'election', 'congress', 'senate', 'vote', 'democrat', 'republican', 'governer', 'legislation', 'impeach'],
    energy: ['oil', 'gas', 'energy', 'opec', 'barrel', 'petroleum', 'solar', 'nuclear', 'pipeline'],
    climate: ['temperature', 'hurricane', 'wildfire', 'climate', 'weather', 'storm', 'drought', 'flood', 'earthquake'],
};

export function categorizeMarket(title: string): MarketCategory | null {
    const titleLower = title.toLowerCase();

    for(const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if(keywords.some(keyword => titleLower.includes(keyword))) {
            return category as MarketCategory;
        }
    }
    return null;
};