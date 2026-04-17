/*
    Generates insights in engligh from market data using chatgpt
    Handles prompt construction, API calls, and insight storage
*/

import OpenAI from "openai";
import { query } from './db.js';
import { selectTopMarkets } from './ranking.js';
import type { MarketSnapshot, Insight } from './types.js';

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY});

const SYSTEM_PROMPT = `You are a financial analyst and also an Economist writing for a general audience. 
DO NOT GIVE FINANCIAL ADVICE. USe phrases such was 'may want to consider' and 'could be interesting.' Kepp it under 120 words. `;

function buildPrompt(market: MarketSnapshot): string {
    const probability = Math.round(market.currentPrice * 100);
    const diff = market.currentPrice - market.previousPrice;
    const trendDir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
    const trendMag = Math.abs(diff * 100).toFixed(1);

    return `Given this prediction market data:
            - Question: ${market.title}
            - Probability: ${probability}%
            - Trend: ${trendDir} ${trendMag}% over last period
            - Category: ${market.category}

            Write a 2-3 sentence insight that:
            1. States the probability in plain english
            2. Explains what this means for everyday decisions
            3. Specifics who should pay attention
    `
}

export async function generateInsight(market: MarketSnapshot): Promise<Insight> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT},
            { role: 'user', content: buildPrompt(market) },
        ],
        max_tokens: 150,
        temperature: 0.7,
    });

    const text = (response.choices[0].message.content ?? '').trim()

    const insight: Insight = {
        marketId: market.kalshiId,
        text,
        generatedAt: new Date(),
    }

    await query(
        `INSERT INTO insights (market_id, text, generatedAt)
        VALUES ($1, $2, $3)
        ON CONFLICT (market_id) DO UPDATE SET text = $2, generated_at = $3`,
        [insight.marketId, insight.text, insight.generatedAt]
    );

    return insight;
}

export async function generateTopMarketInsights(limit: number = 20): Promise<Insight[]> {
    const result = await query<{
        kalshi_id: string,
        title: string
        category: string
        current_price: string
        previous_price: string
        volume: number
        last_updated: Date
    }>('SELECT * FROM markets');

    const allMarkets: MarketSnapshot[] = result.rows.map(r => ({
        kalshiId: r.kalshi_id,
        title: r.title,
        category: r.category as MarketSnapshot['category'],
        currentPrice: parseFloat(r.current_price),
        previousPrice: parseFloat(r.previous_price),
        volume: r.volume,
        lastUpdated: r.last_updated,
    }));

    const topMarkets = selectTopMarkets(allMarkets, limit);
    const insights: Insight[] = [];

    for(const market of topMarkets) {
        try {
            const insight = await generateInsight(market);
            insights.push(insight);
        } catch (err) {
            console.error(`Failed to generate insight for ${market.kalshiId}:`, err);
        }
    }

    console.log(`Generated ${insights.length} insights for top ${limit} markets`);
    return insights;
}