/*
    PostgreSQL connection pool and query helper
    Provides a shared pool instance and a typed query function
*/

import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

export async function query<T extends pg.QueryResultRow>(
    text: string,
    params?: unknown[],
): Promise<pg.QueryResult<T>> {
    return pool.query<T>(text, params);
};

export async function getPool(): Promise<pg.Pool> {
    return pool;
};

export default pool;