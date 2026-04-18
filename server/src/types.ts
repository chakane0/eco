/*
    these are shared typescript types and Zod validation schemas for market data
    insights and subscribers used across the entire backend
*/

import { z } from 'zod/v4';

// Market Category
export const MarketCategorySchema = z.enum(['economics', 'politics', 'climate', 'financials']);
export type MarketCategory = z.infer<typeof MarketCategorySchema>

// Trend Direction
export const TrendDirectionSchema = z.enum(['up', 'down', 'stable']);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

// Market Snapshot
export const MarketSnapshotSchema = z.object({
    kalshiId: z.string().min(1),
    title: z.string().min(1).max(500),
    category: MarketCategorySchema,
    currentPrice: z.number().min(0).max(1),
    previousPrice: z.number().min(0).max(1),
    volume: z.int().min(0),
    lastUpdated: z.date(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

// Insight
export const InsightSchema = z.object({
    marketId: z.string().min(1),
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

// Market with Insight (api response shape)
export const MarketWithInsightSchema = z.object({
    kalshiId: z.string().min(1),
    title: z.string().min(1).max(500),
    category: MarketCategorySchema,
    currentPrice: z.number().min(0).max(1),
    previousPrice: z.number().min(0).max(1),
    trend: TrendDirectionSchema,
    trendPercent: z.number(),
    lastUpdated: z.string(),
    insight: z.string().nullable()
});
export type MarketWithInsight = z.infer<typeof MarketWithInsightSchema>;

// Send result (digest delivery)
export const SendResultSchema = z.object({
    sent: z.int().min(0),
    failed: z.int().min(0),
    errors: z.array(z.string()),
});
export type SendResult = z.infer<typeof SendResultSchema>;

// email validation (reusable)
export const EmailSchema = z.email();

