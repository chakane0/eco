import { writeFileSync } from 'fs';

const API = 'https://api.elections.kalshi.com/trade-api/v2';
const MAX_MARKETS = 100;

function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url: string) {
    const res = await fetch(url);
    if(!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
}

async function main() {
    console.log("fetching events...");
    const data = await fetchJson(`${API}/events?status=open&limit=100`);

    const seriesTickers = new Set<string>();
    for(const e of data.events || []) {
        if(e.series_ticker) seriesTickers.add(e.series_ticker);
    }
    console.log(`Found ${seriesTickers.size} series`);

    const matched: any[] = [];

    for(const series of seriesTickers) {
        if(matched.length >= MAX_MARKETS) break;
        console.log(`Fetching ${series}`);
        try {
            const mdata = await fetchJson(`${API}/markets?series_ticker=${series}&status=open&limit=10`);
            for(const m of mdata.markets || []) {
                if(matched.length >= MAX_MARKETS) break;
                matched.push(m);
                console.log(`  ${m.title}`);
            }
        } catch(err) {
            console.error(`  Failed: ${err}`);
        }
        await delay(300);
    }

    writeFileSync(
        'testData/kalshiTestData.json',
        JSON.stringify({markets: matched}, null, 2)
    );
    console.log(`\nSaved ${matched.length} markers`);
}

main().catch(console.error);

