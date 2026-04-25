// ABOUTME: Database schema creation script for PostgreSQL.
// ABOUTME: Creates events, markets, insights, and subscribers tables.

import pool from './db.js'

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_ticker VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL,
    total_volume NUMERIC NOT NULL DEFAULT 0,
    is_mutually_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
    market_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    kalshi_id VARCHAR(255) UNIQUE NOT NULL,
    event_ticker VARCHAR(255) NOT NULL REFERENCES events(event_ticker) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    current_price NUMERIC(5, 4) NOT NULL CHECK (current_price >= 0 AND current_price <= 1),
    previous_price NUMERIC(5, 4) NOT NULL CHECK (previous_price >= 0 AND previous_price <= 1),
    volume NUMERIC NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    event_ticker VARCHAR(255) UNIQUE NOT NULL REFERENCES events(event_ticker) ON DELETE CASCADE,
    text TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );
`

export async function createTables(): Promise<void> {
  await pool.query(CREATE_TABLES)
  console.log('Database tables created successfully')
}

export async function dropTables(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS insights, markets, events, subscribers CASCADE')
  console.log('Database tables dropped')
}
