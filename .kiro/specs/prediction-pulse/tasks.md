# Implementation Plan: Prediction Pulse

## Overview

Build a prediction market insight dashboard: Express + PostgreSQL backend, OpenAI insight layer, React + TypeScript frontend, and weekly email digest. Tasks follow the build order: backend core → AI layer → frontend → email/digest → wiring and final validation. Each task references specific requirements for traceability.

## Tasks

- [ ] 1. Set up project structure, database schema, and shared types
  - [ ] 1.1 Initialize monorepo with backend and frontend directories, install core dependencies (Express, pg, zod, TypeScript, vitest, fast-check, node-cron, openai)
    - Create `server/` and `client/` directories
    - Add `tsconfig.json` for both backend and frontend
    - Set up vitest config with fast-check support
    - _Requirements: None (infrastructure)_

  - [ ] 1.2 Define shared TypeScript types and Zod validation schemas
    - Create `MarketCategory`, `TrendDirection`, `MarketSnapshot`, `Insight`, `Subscriber`, `MarketWithInsight`, `SendResult` types
    - Create Zod schemas for market data validation (price in [0,1], volume non-negative integer, title non-empty max 500 chars, kalshiId non-empty, category one of four values)
    - Create Zod schema for email validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 1.3 Create PostgreSQL schema and database connection module
    - Create `markets` table (id, kalshi_id UNIQUE, title, category, current_price, previous_price, volume, last_updated)
    - Create `insights` table (id, market_id FK, text, generated_at) with unique constraint on market_id
    - Create `subscribers` table (id, email UNIQUE, subscribed_at, active DEFAULT true)
    - Set up pg connection pool with error handling that returns 503 on connection loss
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.3_

- [ ] 2. Implement Market Fetcher and categorization
  - [ ] 2.1 Implement `categorizeMarket` function with keyword matching
    - Match market titles against predefined keyword lists for economy, politics, energy, climate
    - Return `null` for titles that don't match any category
    - Must be deterministic: same title always returns same category
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test for market categorization
    - **Property 2: Market Categorization Correctness**
    - Generate random market titles, verify `categorizeMarket` returns the same result on every invocation with the same title. Verify titles containing category keywords return the correct category, and titles with no keywords return null.
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ] 2.3 Implement `fetchAndSyncMarkets` with Kalshi API client and price rotation
    - Call Kalshi REST API for active markets
    - Categorize and filter to known categories (skip uncategorizable markets)
    - Upsert each market: rotate `currentPrice` → `previousPrice`, set new `currentPrice`
    - For new markets: set `previousPrice = currentPrice` (no false trend)
    - Validate all data with Zod schemas before storage
    - On Kalshi API error (non-200 or timeout): log error, skip cycle, don't modify DB
    - On malformed market data: skip that market, log warning, continue with remaining
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.4 Write property test for price rotation integrity
    - **Property 1: Price Rotation Integrity**
    - For any market that exists in the database before sync with `currentPrice = X`, after sync `previousPrice` SHALL equal `X` and `currentPrice` SHALL equal the new Kalshi value. For first-time markets, `previousPrice` SHALL equal `currentPrice`.
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.5 Write property test for market data validation
    - **Property 6: Market Data Validation**
    - Generate random market data. Verify that stored markets always have `currentPrice` and `previousPrice` in [0, 1], `volume` as non-negative integer, `title` as non-empty string max 500 chars.
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 3. Implement market ranking and trend calculation
  - [ ] 3.1 Implement `selectTopMarkets` function
    - Sort markets by volume descending, return at most `limit` markets
    - Every included market must have volume >= every excluded market
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 3.2 Write property test for top market selection
    - **Property 3: Top Market Selection Correctness**
    - Generate random arrays of MarketSnapshot with random volumes and random positive limit. Verify result has at most `limit` items, is sorted by volume descending, and no excluded market has higher volume than any included market.
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ] 3.3 Implement trend calculation logic (direction and percent)
    - `currentPrice > previousPrice` → "up"
    - `currentPrice < previousPrice` → "down"
    - `currentPrice === previousPrice` → "stable"
    - `trendPercent = (currentPrice - previousPrice) * 100`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.4 Write property test for trend calculation
    - **Property 7: Trend Calculation Consistency**
    - Generate random (currentPrice, previousPrice) pairs in [0, 1]. Verify trend direction matches the sign of the difference, and `trendPercent` equals `(currentPrice - previousPrice) * 100`.
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement REST API endpoints
  - [ ] 5.1 Implement `GET /api/markets` endpoint
    - Return top 20 markets by volume with joined insights
    - Support optional `?category=` filter
    - Include trend direction and trendPercent in response
    - Markets without insights return `insight: null`
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 10.3_

  - [ ] 5.2 Implement `POST /api/subscribers` endpoint with email validation
    - Validate email format with Zod; return 400 on invalid/empty
    - Create new subscriber with `active = true`, return 201
    - If email exists and active: idempotent success (no duplicate)
    - If email exists and inactive: reactivate, set `active = true`
    - Enforce unique email constraint
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.3 Write property test for subscriber idempotency
    - **Property 8: Subscriber Idempotency**
    - For any valid email, calling `addSubscriber` multiple times results in exactly one subscriber record with that email and `active = true`.
    - **Validates: Requirements 7.1, 7.2, 7.5**

  - [ ]* 5.4 Write property test for subscriber reactivation
    - **Property 9: Subscriber Reactivation**
    - For any email that was subscribed then deactivated, calling `addSubscriber` again sets `active = true` without creating a duplicate.
    - **Validates: Requirement 7.3**

  - [ ]* 5.5 Write property test for invalid email rejection
    - **Property 10: Invalid Email Rejection**
    - Generate random strings that are not valid email format (including empty strings). Verify `addSubscriber` rejects the input and stores nothing.
    - **Validates: Requirement 7.4**

  - [ ] 5.6 Implement `DELETE /api/subscribers/:email` endpoint
    - Soft delete: set `active = false`
    - Return success response
    - _Requirements: 8.1_

  - [ ] 5.7 Add API security middleware
    - Input validation and sanitization on all endpoints (email, query params)
    - CORS configured to allow only frontend origin
    - Rate limiting on subscriber endpoint (10 req/min per IP)
    - Sanitize AI-generated insight text in responses to prevent XSS
    - API keys stored as environment variables
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 5.8 Write property test for AI output sanitization
    - **Property 14: AI Output Sanitization**
    - Generate random strings containing HTML tags and script elements. Verify the sanitization function removes or escapes dangerous content.
    - **Validates: Requirement 12.4**

  - [ ] 5.9 Add database error handling middleware
    - Return HTTP 503 with service unavailable message on DB connection loss
    - _Requirements: 11.3_

- [ ] 6. Implement AI Insight Generator
  - [ ] 6.1 Implement `generateInsight` function with OpenAI integration
    - Build structured prompt containing market title, current probability, trend direction/magnitude, and category
    - Call OpenAI GPT-4o-mini with appropriate token limits
    - Enforce 60-word max on insight text
    - Upsert insight in database (one active insight per market)
    - On OpenAI failure: log error, continue with remaining markets
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 6.2 Write property test for insight prompt completeness
    - **Property 4: Insight Prompt Completeness**
    - For any valid MarketSnapshot, verify the built prompt contains the market title, current probability, trend direction and magnitude, and category.
    - **Validates: Requirement 4.2**

  - [ ]* 6.3 Write property test for insight upsert uniqueness
    - **Property 5: Insight Upsert Uniqueness**
    - For any market, after generating insights multiple times, exactly one active insight record exists in the database for that market.
    - **Validates: Requirement 4.4**

  - [ ] 6.4 Implement `generateTopMarketInsights` for the 12-hour scheduler
    - Select top 20 markets by volume
    - Generate insights for each
    - _Requirements: 4.1_

- [ ] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement React Dashboard
  - [ ] 8.1 Set up React + TypeScript frontend with API client
    - Initialize React app in `client/` directory
    - Create typed API client for `GET /api/markets` and `POST /api/subscribers`
    - _Requirements: None (infrastructure)_

  - [ ] 8.2 Implement market dashboard with category tabs and market cards
    - Fetch markets from REST API on load
    - Display markets as cards grouped by category tabs (economy, politics, energy, climate + "all")
    - Each card shows: title, probability as percentage, trend arrow (↑/↓/→), trend magnitude %, AI insight (if available)
    - Cards without insights display without insight section (no error)
    - Category tab filters displayed markets
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 8.3 Write property test for market card rendering completeness
    - **Property 13: Market Card Rendering Completeness**
    - For any MarketWithInsight with non-null insight, verify the rendered card contains the title, probability percentage, trend arrow, trend magnitude, and insight text.
    - **Validates: Requirement 10.2**

  - [ ] 8.4 Implement auto-refresh, loading states, and error handling
    - Auto-refresh market data every 5 minutes
    - Show loading indicator while fetching
    - Show user-friendly error message on API error
    - _Requirements: 10.5, 11.1, 11.2_

  - [ ] 8.5 Implement email signup form
    - Email input with client-side format validation
    - Submit to `POST /api/subscribers`
    - Show success/error feedback
    - _Requirements: 7.1, 7.4_

- [ ] 9. Implement Email Digest Service
  - [ ] 9.1 Implement `buildAndSendDigest` function
    - Query top 5 markets by absolute price change (`|currentPrice - previousPrice|`)
    - Generate fresh AI insight for each mover
    - Build HTML + plain text email content
    - Send to every active subscriber via Resend/SendGrid
    - On individual send failure: log error, continue with remaining subscribers
    - If no active subscribers: return `{ sent: 0, failed: 0, errors: [] }`
    - `sent + failed` must equal total active subscribers
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 9.2 Write property test for digest mover selection
    - **Property 11: Digest Mover Selection**
    - Generate random market arrays. Verify digest selects at most 5 markets sorted by absolute price change descending, and every selected market has absolute change >= every non-selected market.
    - **Validates: Requirement 9.1**

  - [ ]* 9.3 Write property test for digest delivery accounting
    - **Property 12: Digest Delivery Accounting**
    - For any digest send operation with `n` active subscribers, verify `sent + failed` equals `n`.
    - **Validates: Requirement 9.6**

- [ ] 10. Wire up schedulers and integrate all components
  - [ ] 10.1 Set up node-cron schedulers
    - 30-minute cron for `fetchAndSyncMarkets`
    - 12-hour cron for `generateTopMarketInsights`
    - Weekly cron (Monday 8am) for `buildAndSendDigest`
    - Each scheduler logs execution results and handles errors gracefully
    - _Requirements: 1.1, 4.1, 9.1_

  - [ ] 10.2 Create server entry point wiring Express app, schedulers, and database
    - Initialize database connection pool
    - Mount all API routes with middleware (CORS, rate limiting, sanitization)
    - Start cron jobs
    - Add graceful shutdown handling
    - _Requirements: 12.2, 12.3, 12.5_

- [ ] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 14 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Build order follows: Backend → AI layer → Frontend → Email → Wiring
