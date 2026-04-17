/*
    Fetches active markets from Kalshi's public API and syncs them to the database
    Handles price rotation, categorization, validation, and pagincation
*/

import { query } from './db.js';
import { categorizeMarket } from './categorize.js';
import { MarketSnapshotSchema, type MarketSnapshot, type MarketCategory } from './types.js';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

interface KalshiMarket {
    ticker: string
    title: string
    yes_bid: number
    volume: number
    status: string
};

interface KalshiResponse {
    markets: KalshiMarket[]
    cursor: string
};

async function fetchAllActiveMarkets(): Promise<KalshiMarket[]> {
    const allMarkets: KalshiMarket[] =[];
    let cursor = '';
    let pages = 0;
    const MAX_PAGES = 5;

    do {
        const url = new URL(`${KALSHI_API_BASE}/markets`);
        url.searchParams.set('status', 'open');
        url.searchParams.set('limit', '1000');
        if(cursor) url.searchParams.set('cursor', cursor);

        const response = await fetch(url.toString());

        if(!response.ok) {
            throw new Error(`Kalshi API returned ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as KalshiResponse
        allMarkets.push(...data.markets);
        cursor = data.cursor;
        if(cursor) await delay(200);
        console.log(`Fetched ${allMarkets.length} markets so far...`)
        cursor = data.cursor;
        pages++;
        if(cursor && pages < MAX_PAGES) await delay(200);

    } while(cursor && pages < MAX_PAGES) 
    return allMarkets;
};

async function upsertMarket(
    kalshiId: string,
    title: string,
    category: MarketCategory,
    price: number,
    volume: number,
): Promise<void> {
    const existing = await query<{ current_price: number }>(
        'SELECT current_price FROM markets WHERE kalshi_id = $1',
        [kalshiId]
    );

    if(existing.rows.length > 0) {
        await query(
            `UPDATE markets SET previous_price = current_price,
                current_price = $1,
                volume = $2,
                title = $3,
                last_updated = NOW()
                WHERE kalshi_id = $4
            `,
            [price, volume, title, kalshiId]
        )
    } else {
        await query (
            `INSERT INTO markets (kalshi_id, title, category, current_price, previous_price, volume, last_updated)
 VALUES ($1, $2, $3, $4, $4, $5, NOW())`,
            [kalshiId, title, category, price, volume]
        )
    }
};

export async function fetchAndSyncMarkets(): Promise<MarketSnapshot[]> {
    const kalshiMarkets = await fetchAllActiveMarkets();
    const snapshots: MarketSnapshot[] = [];

    for(const market of kalshiMarkets) {
        
        const category = categorizeMarket(market.title);
        if(!category) continue;

        const price = Math.max(0, Math.min(1, market.yes_bid ?? 0));
        const volume = Math.max(0, Math.floor(market.volume ?? 0));
        const title = (market.title ?? '').slice(0, 500);

        if(!market.ticker || !title) {
            console.warn('Skipping malformed market:', JSON.stringify(market));
            continue;
        }

        try {
            await upsertMarket(market.ticker, title, category, price, volume);
            
            const row = await query<{
                kalshi_id: string
                title: string
                category: MarketCategory
                current_price: string
                previous_price: string
                volume: number
                last_updated: Date
            }>(
                'SELECT * FROM markets WHERE kalshi_id = $1',
                [market.ticker]
            )

            if(row.rows[0]) {
                const r = row.rows[0]
                snapshots.push({
                    kalshiId: r.kalshi_id,
                    title: r.title,
                    category: r.category,
                    currentPrice: parseFloat(r.current_price),
                    previousPrice: parseFloat(r.previous_price),
                    volume: r.volume,
                    lastUpdated: r.last_updated,
                });
            }
        } catch (err) {
            console.warn(`Skipping market ${market.ticker}:`, err);
            continue;
        }
    }
    console.log(`Synced ${snapshots.length} markets`);
    return snapshots;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}