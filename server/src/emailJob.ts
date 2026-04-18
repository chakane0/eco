/*
    Compiles weekly email digest of top market movers and sends to subscribers
    Selects top of by absolute price change, generates fresh insights, sends via email service
*/

import { query } from './db.js';
import { generateInsight } from './insights.js';
import type { MarketSnapshot, SendResult } from './types.js';

interface DigestInsight {
    market: MarketSnapshot
    insightText: string
};

async function getTopMovers(limit: number = 5): Promise<MarketSnapshot[]> {
    const result = await query<{
        kalshi_id: string
        title: string
        category: string
        current_price: string
        previous_price: string
        volume: number
        last_updated: Date
    }>(
        `SELECT * FROM markets
        ORDER BY ABS(current_price - previous_price) DESC
        LIMIT $1`,
        [limit]
    )

    return result.rows.map(r => ({
        kalshiId: r.kalshi_id,
        title: r.title,
        category: r.category as MarketSnapshot['category'],
        currentPrice: parseFloat(r.current_price),
        previousPrice: parseFloat(r.previous_price),
        volume: r.volume,
        lastUpdated: r.last_updated,
    }))
}

function buildDigestHtml(insights: DigestInsight[]): string {
    const rows = insights.map(({market, insightText}) => {
        const probability = Math.round(market.currentPrice * 100);
        const change = ((market.currentPrice - market.previousPrice) * 100).toFixed(1);
        const arrow = parseFloat(change) > 0 ? '↑' : parseFloat(change) < 0 ? '↓' : '→';

        return  `
                <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h3 style="margin: 0 0 8px 0;">${market.title}</h3>
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">
                    ${probability}% <span style="font-size: 14px; font-weight: normal;">${arrow} ${Math.abs(parseFloat(change))}%</span>
                    </p>
                    <p style="margin: 0; color: #4b5563;">${insightText}</p>
                </div>
                `
    }).join('');

    return `
            <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
            <h1 style="font-size: 24px;">Prediction Pulse: Weekly Digest</h1>
            <p style="color: #6b7280;">Here are the top market movers this week.</p>
            ${rows}
            <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
                You're receiving this because you subscribed to Prediction Pulse.
            </p>
            </div>
            `
}

export async function buildAndSendDigest(): Promise<SendResult> {
    const movers = await getTopMovers(5);
    const digestInsights: DigestInsight[] = [];
    for(const market of movers) {
        try {
            const insight = await generateInsight(market);
            digestInsights.push({market, insightText: insight.text});
        } catch (err) {
            console.error(`Failed to generate digest input for ${market.kalshiId}`, err);
        }
    }

    const subscribers = await query<{email: string}>(
        `SELECT email FROM subscribers WHERE active = true`
    );

    if(subscribers.rows.length === 0) {
        return { sent: 0, failed: 0, errors: []}
    }

    const html = buildDigestHtml(digestInsights);
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for(const {email} of subscribers.rows) {
        try {
            // TODO: replace with actual email service (gmail maybe)
            console.log(`Digest would send to ${email}`);
            sent++;
        } catch(err) {
            failed++;
            const msg = err instanceof Error ? err.message : String(err)
            errors.push(`Failed to sedn to ${email}: ${msg}`);
        }
    }
    console.log(`Digest sent ${sent} success, ${failed} failed`);
    return { sent, failed, errors };
}