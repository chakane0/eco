/*
    Express server entry point with security middleware
    Mounts API routes, CORS, rate limitng, and JSON parsing
*/

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { router } from './routes.js';
import { createTables } from './schema.js';

import cron from 'node-cron';
import { fetchAndSyncMarkets } from './fetcher.js';
import { generateTopMarketInsights } from './insights.js';
import { buildAndSendDigest } from './digest.js';

const app = express();
const PORT = process.env.PORT || 3001;

// JSON body parsing
app.use(express.json());

// cors - restrict to frontend origin
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({origin: FRONTEND_ORIGIN}));

// rate limiting on subscriber endpoint
const subscriberLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'too many requests try again later'},
});
app.use('/api/subscribers', subscriberLimiter);

// mount routes
app.use('/api', router);

// health check
app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
});

async function start() {
    try {
        await createTables()
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Dailed to start server', err);
        process.exit(1);
    }

    // fetch markets every 30 mins
    cron.schedule('*/30 * * * *', async () => {
        try {
            await fetchAndSyncMarkets()
        } catch(err) {
            console.error('Market fetch failed:', err);
        }
    });

    // generate insights every 12 hours
    cron.schedule('0 */12 * * *', async () => {
        try {
            await generateTopMarketInsights(20);
        } catch(err) {
            console.error('Insight generation failed:', err);
        }
    });

    // weekly digest every monday at 8am
    cron.schedule('0 8 * * 1', async () => {
        try {
            await buildAndSendDigest();
        } catch(err) {
            console.error('Digest and send failed:', err);
        }
    });

    // run initial fetch on startup
    fetchAndSyncMarkets().catch(err => {
        console.error('Internal market fetch failed:', err);
    });
}

start();
export default app;