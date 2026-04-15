/*
    Database schema creation script for PostgreSQL
    Creates markets, insights, and subscribers tables if they dont exist
*/

import pool from './db.js';

const CREATE_TABLES = `
    CREATE TABLE IF NOT EXISTS markets (
        id SERIAL PRIMARY KEY,
        kalshi_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (catrgory IN ('economy', 'politics', 'energy', 'climate')),
        current_price NUMERIC(5, 4) NOT NULL CHECK (current_price >= 0 AND current_price <= 1),
        previous_price NUMERIC(5, 4) NOT NULL CHECK (previous_price >= 0 AND previous_price <= 1),
        volume INTEGER NOT NULL DEFAULT 0 CHECK (volume >= 0),
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS insights (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(255) UNIQUE NOT NULL REFERENCES markets(kalshi_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        activate BOOLEAN NOT NULL DEFAULT TRUE
    );
`

export async function createTables(): Promise<void> {
    await pool.query(CREATE_TABLES);
    console.log('Database tables created successfully');
};

export async function dropTable(): Promise<void> {
    await pool.query('DROP TABLE IF EXISTS insights, subscribers, markets CASCADE');
    console.log('Database tables dropped');
};