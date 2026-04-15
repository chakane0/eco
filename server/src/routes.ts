/*
    Express route handlers for the REST API
    Serves market data with insights and manages email subscription
*/

import { Router } from 'express';
import { query } from './db.js';
import { calculateTrend } from './trend.js';
import { EmailSchema, type MarketCategory, type MarketWithInsight } from './types.js';
import { string } from 'zod';

export const router = Router();

// GET /api/markets?category=:category
router.get('/markets', async (requestAnimationFrame, res) => {
    try {
        const category = requestAnimationFrame.query.category as string | undefined
        const validCategories = ['economy', 'politics', 'energy', 'climate'];

        let sql = `
            SELECT m.*, i.text as insight_text
            FROM markets m
            LEFT JOIN insights i ON m.kalshi_id = i.market_id
        `

        const params: unknown[] = [];

        if(category && validCategories.includes(category)) {
            sql += ' WHERE m.category = $1'
            params.push(category);
        }

        sql += ' ORDER BY m.volume DESC LIMIT 20';

        const result = await query<{
            kalshi_id: string
            title: string
            category: MarketCategory
            current_price: string
            previous_price: string
            volume: number
            last_updated: Date
            insight_text: string | null
        }>(sql, params)

        const markets: MarketWithInsight[] = result.rows.map(row => {
            const currentPrice = parseFloat(row.current_price);
            const previousPrice = parseFloat(row.previous_price);
            const { direction, percent } = calculateTrend(currentPrice, previousPrice);

            return {
                kalshiId: row.kalshi_id,
                title: row.title,
                category: row.category,
                currentPrice,
                previousPrice,
                trend: direction,
                trendPercent: Math.round(percent * 10) / 10,
                lastUpdated: row.last_updated.toISOString(),
                insight: row.insight_text,
            }
        });

        res.json({markets});
    } catch (err) {
        console.error('Error fetching markets:', err);
        res.status(503).json({error: 'Service temporarily unavailable'});
    }
})

// POST /api/subscribers
router.post('/subscribers', async (req, res) => {
    try {
        const { email } = req.body;

        const parsed = EmailSchema.safeParse(email);
        if(!parsed.success) {
            res.status(400).json({error: 'Invalid email address'});
            return;
        }

        const existing = await query<{ active: boolean }>(
            'SELECT active FROM subscribers WHERE email = $1',
            [parsed.data]
        )

        if(existing.rows.length > 0) {
            if(!existing.rows[0].active) {
                await query('UPDATE subscribers SET active = true WHERE email = $1', [parsed.data]);
            }
            res.status(201).json({message: 'Subscribed sucessfully'});
            return;
        }

        await query(
            'INSERT INTO subscribers (email, subscribed_at, active) VALUES ($1, NOW(), true',
            [parsed.data]
        );
        res.status(201).json({message: 'Subscribed successfully'});
    } catch (err) {
        console.error('Error adding subscribers:', err);
        res.status(503).json({error: 'Service temporarily unavailable'});
    }
})

// DELETE /api/subscribers/:email
router.delete('/subscribers/:email', async (req, res) => {
    try {
        const { email } = req.params;
        await query('UPDATE subscribers SET active = false WHERE email = $1', [email]);
        res.json({message: 'Unsubscribed successfully'});
    } catch (err) {
        console.error('Error removing subscriber:', err);
        res.status(503).json({error: 'Service temporarily unavailable'});
    }
})