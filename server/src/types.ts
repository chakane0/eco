/*
    these are shared typescript types and Zod validation schemas for market data
    insights and subscribers used across the entire backend
*/

import { z } from 'zod/v4';

// Market Category
export type MarketCategory = string

// Trend Direction
export const TrendDirectionSchema = z.enum(['up', 'down', 'stable']);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

// Event (parent grouping of markets)
export interface KalshiEvent {
    eventTicker: string
    title: string
    category: MarketCategory
    totalVolume: number
    isMutuallyExclusive: boolean
    marketCount: number
    lastUpdated: Date
}

// Market Snapshot (child of an event)
export const MarketSnapshotSchema = z.object({
    kalshiId: z.string().min(1),
    eventTicker: z.string().min(1),
    title: z.string().min(1).max(500),
    currentPrice: z.number().min(0).max(1),
    previousPrice: z.number().min(0).max(1),
    volume: z.number().min(0),
    lastUpdated: z.date(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

// Insight (per event, not per market)
export const InsightSchema = z.object({
    eventTicker: z.string().min(1),
    text: z.string().min(1),
    generatedAt: z.date(),
});
export type Insight = z.infer<typeof InsightSchema>;

// Subscriber
export const SubscriberSchema = z.object({
    email: z.email(),
    subscribedAt: z.date(),
    active: z.boolean(),
});
export type Subscriber = z.infer<typeof SubscriberSchema>;

// Event with Insight (API response shape)
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

// Send result (digest delivery)
export const SendResultSchema = z.object({
    sent: z.int().min(0),
    failed: z.int().min(0),
    errors: z.array(z.string()),
});
export type SendResult = z.infer<typeof SendResultSchema>;

// email validation (reusable)
export const EmailSchema = z.email();

