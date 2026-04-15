# Requirements Document

## Introduction

Prediction Pulse is a web application that fetches live prediction market data from Kalshi's public REST API, categorizes markets by topic, and uses OpenAI's GPT-4o-mini to generate plain-English insights for non-traders. The target audience is small business owners, freelancers, and financially-aware individuals who want actionable context from prediction markets without needing to understand trading mechanics. The MVP consists of three pillars: a market dashboard, an AI insight layer, and a weekly email digest with signup.

## Glossary

- **Market_Fetcher**: The backend component responsible for pulling active market data from the Kalshi API and storing snapshots in the database
- **Insight_Generator**: The backend component that produces plain-English insights from market data using OpenAI's GPT-4o-mini
- **REST_API**: The Express-based HTTP server that serves market data, insights, and handles subscriber management
- **Digest_Service**: The backend component that compiles weekly email digests of top market movers and sends them to subscribers
- **Dashboard**: The React + TypeScript frontend that displays categorized market cards with AI insights and provides email signup
- **Market**: A prediction market contract from Kalshi, represented internally with a title, category, price (probability), volume, and trend data
- **Insight**: An AI-generated plain-English explanation of a market's significance, limited to 60 words
- **Subscriber**: An email address registered to receive the weekly digest
- **Market_Category**: One of four allowed topic classifications: economy, politics, energy, or climate
- **Trend_Direction**: A derived value indicating whether a market's probability moved up, down, or remained stable since the last snapshot
- **Market_Snapshot**: A point-in-time record of a market's current price, previous price, volume, and metadata
- **Digest**: A weekly email containing the top 5 market movers with AI-generated insights

## Requirements

### Requirement 1: Market Data Fetching

**User Story:** As a dashboard visitor, I want to see current prediction market data, so that I can understand what prediction markets are signaling about real-world events.

#### Acceptance Criteria

1. WHEN the 30-minute scheduler triggers, THE Market_Fetcher SHALL retrieve all active markets from the Kalshi public REST API
2. WHEN the Market_Fetcher receives market data from Kalshi, THE Market_Fetcher SHALL upsert each market record in the database by rotating the existing currentPrice to previousPrice and setting currentPrice to the new value from Kalshi
3. WHEN a market is fetched for the first time, THE Market_Fetcher SHALL store it with previousPrice equal to currentPrice so that no false trend is displayed
4. WHEN the Kalshi API returns a non-200 status or times out, THE Market_Fetcher SHALL log the error and skip the fetch cycle without modifying existing database records
5. WHEN the Kalshi API returns malformed data for a specific market, THE Market_Fetcher SHALL skip that market, log a warning with the raw data, and continue processing remaining valid markets

### Requirement 2: Market Categorization

**User Story:** As a dashboard visitor, I want markets grouped by topic, so that I can quickly find markets relevant to my interests.

#### Acceptance Criteria

1. WHEN the Market_Fetcher processes a market from Kalshi, THE Market_Fetcher SHALL assign it a Market_Category by matching keywords in the market title against predefined keyword lists for economy, politics, energy, and climate
2. WHEN a market title does not match any category keyword list, THE Market_Fetcher SHALL exclude that market from storage and the dashboard
3. THE Market_Fetcher SHALL produce the same Market_Category for the same market title on every invocation

### Requirement 3: Market Ranking

**User Story:** As a dashboard visitor, I want to see the most actively traded markets, so that I can focus on the markets with the strongest signal.

#### Acceptance Criteria

1. WHEN the Dashboard requests markets, THE REST_API SHALL return at most 20 markets sorted by trading volume in descending order
2. WHEN a category filter is applied, THE REST_API SHALL return at most 20 markets within that category sorted by trading volume in descending order
3. FOR ALL market arrays and a positive integer limit, the selectTopMarkets function SHALL return at most limit markets, and every included market SHALL have volume greater than or equal to every excluded market

### Requirement 4: AI Insight Generation

**User Story:** As a non-trader, I want plain-English explanations of what prediction markets mean, so that I can make informed decisions without understanding trading mechanics.

#### Acceptance Criteria

1. WHEN the 12-hour scheduler triggers, THE Insight_Generator SHALL generate insights for the top 20 markets by trading volume
2. WHEN generating an insight for a market, THE Insight_Generator SHALL build a structured prompt containing the market title, current probability, trend direction and magnitude, and category
3. THE Insight_Generator SHALL produce insight text that is at most 60 words
4. THE Insight_Generator SHALL store each generated insight in the database, upserting so that only one active insight exists per market
5. WHEN the OpenAI API fails for a specific market, THE Insight_Generator SHALL log the error and continue generating insights for remaining markets without affecting previously stored insights

### Requirement 5: Market Data Validation

**User Story:** As a system operator, I want all stored market data to be valid, so that the dashboard displays accurate information.

#### Acceptance Criteria

1. THE Market_Fetcher SHALL store currentPrice and previousPrice values only within the range 0 to 1 inclusive
2. THE Market_Fetcher SHALL store volume as a non-negative integer
3. THE Market_Fetcher SHALL store kalshiId as a non-empty unique string
4. THE Market_Fetcher SHALL store title as a non-empty string of at most 500 characters
5. THE Market_Fetcher SHALL store category as one of the four allowed Market_Category values

### Requirement 6: Trend Calculation

**User Story:** As a dashboard visitor, I want to see whether a market's probability is trending up or down, so that I can understand the direction of change at a glance.

#### Acceptance Criteria

1. WHEN a market has currentPrice greater than previousPrice, THE REST_API SHALL return the Trend_Direction as "up"
2. WHEN a market has currentPrice less than previousPrice, THE REST_API SHALL return the Trend_Direction as "down"
3. WHEN a market has currentPrice equal to previousPrice, THE REST_API SHALL return the Trend_Direction as "stable"
4. WHEN returning market data, THE REST_API SHALL include a trendPercent value calculated as the difference between currentPrice and previousPrice multiplied by 100

### Requirement 7: Email Subscription

**User Story:** As a visitor interested in prediction markets, I want to sign up with my email, so that I can receive weekly market digests without creating an account.

#### Acceptance Criteria

1. WHEN a visitor submits a valid email address, THE REST_API SHALL create a subscriber record with active status set to true and return HTTP 201
2. WHEN a visitor submits an email that already exists as an active subscriber, THE REST_API SHALL treat the operation as idempotent and return success without creating a duplicate
3. WHEN a visitor submits an email that exists as an inactive subscriber, THE REST_API SHALL reactivate the subscriber by setting active to true
4. WHEN a visitor submits an invalid email format or empty string, THE REST_API SHALL return HTTP 400 with an error message and store nothing
5. THE REST_API SHALL enforce that no two subscriber records share the same email address

### Requirement 8: Email Unsubscription

**User Story:** As a subscriber, I want to unsubscribe from the digest, so that I can stop receiving emails when I no longer want them.

#### Acceptance Criteria

1. WHEN a subscriber requests removal, THE REST_API SHALL set the subscriber's active status to false (soft delete) and return a success response

### Requirement 9: Weekly Digest

**User Story:** As a subscriber, I want a weekly email summarizing the biggest market moves with plain-English insights, so that I stay informed without checking the dashboard.

#### Acceptance Criteria

1. WHEN the weekly scheduler triggers, THE Digest_Service SHALL identify the top 5 markets by absolute price change
2. WHEN building the digest, THE Digest_Service SHALL generate a fresh AI insight for each of the top 5 movers
3. WHEN the digest is built, THE Digest_Service SHALL send it to every active subscriber
4. WHEN an email fails to deliver to a specific subscriber, THE Digest_Service SHALL log the failure and continue sending to remaining subscribers
5. WHEN no active subscribers exist, THE Digest_Service SHALL complete without sending any emails and return a result of zero sent and zero failed
6. FOR ALL digest send operations, the sum of sent and failed counts SHALL equal the total number of active subscribers

### Requirement 10: Dashboard Display

**User Story:** As a visitor, I want a clean dashboard showing market cards organized by category, so that I can browse prediction market data without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN a visitor loads the Dashboard, THE Dashboard SHALL fetch markets from the REST_API and display them as cards grouped by category tabs
2. WHEN displaying a market card, THE Dashboard SHALL show the market title, probability as a percentage, trend direction with an arrow indicator, trend magnitude as a percentage, and the AI insight if available
3. WHEN a market has no AI insight, THE Dashboard SHALL display the card without an insight section rather than showing an error
4. WHEN the visitor selects a category tab, THE Dashboard SHALL filter the displayed markets to that category
5. WHILE the Dashboard is open, THE Dashboard SHALL auto-refresh market data every 5 minutes

### Requirement 11: Dashboard Error States

**User Story:** As a visitor, I want clear feedback when something goes wrong, so that I understand the dashboard is temporarily unavailable rather than broken.

#### Acceptance Criteria

1. WHILE the Dashboard is loading market data, THE Dashboard SHALL display a loading indicator
2. WHEN the REST_API returns an error, THE Dashboard SHALL display a user-friendly error message
3. WHEN the database connection is lost, THE REST_API SHALL return HTTP 503 with a service unavailable message

### Requirement 12: API Security

**User Story:** As a system operator, I want the API to be protected against common abuse, so that the service remains available and data stays clean.

#### Acceptance Criteria

1. THE REST_API SHALL validate and sanitize all user input including email addresses and query parameters before processing
2. THE REST_API SHALL configure CORS to allow requests only from the frontend origin
3. THE REST_API SHALL apply rate limiting to the subscriber endpoint at a maximum of 10 requests per minute per IP address
4. THE REST_API SHALL sanitize AI-generated insight text before including it in API responses to prevent XSS
5. THE REST_API SHALL store API keys for OpenAI and email services as environment variables, not in code or client-side bundles
