// ABOUTME: Fetches real Kalshi data for analysis and optimization.
// ABOUTME: Saves events with their markets, total volume, and mutually exclusive flag.

import { writeFileSync } from 'fs'

const API = 'https://api.elections.kalshi.com/trade-api/v2'
const MAX_EVENTS = 50

const CATEGORY_MAP: Record<string, string> = {
  'Economics': 'economics',
  'Financials': 'financials',
  'Companies': 'financials',
  'Politics': 'politics',
  'Elections': 'politics',
  'Climate and Weather': 'climate',
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

async function main() {
  console.log('Fetching events...')
  const data = await fetchJson(`${API}/events?status=open&limit=200`)

  const events = (data.events || [])
    .filter((e: any) => CATEGORY_MAP[e.category])
    .slice(0, MAX_EVENTS)

  console.log(`Found ${events.length} matching events out of ${data.events?.length || 0} total`)

  const results: any[] = []

  for (const event of events) {
    console.log(`[${CATEGORY_MAP[event.category]}] ${event.title}`)

    try {
      const mdata = await fetchJson(
        `${API}/markets?event_ticker=${event.event_ticker}&status=open&limit=20`
      )

      const markets = (mdata.markets || [])
        .map((m: any) => ({
          ticker: m.ticker,
          marketTitle: m.title,
          yesBid: m.yes_bid_dollars,
          yesAsk: m.yes_ask_dollars,
          lastPrice: m.last_price_dollars,
          volume: m.volume_fp,
          volume24h: m.volume_24h_fp,
          openInterest: m.open_interest_fp,
          previousPrice: m.previous_price_dollars,
          status: m.status,
        }))
        .sort((a: any, b: any) => parseFloat(b.volume) - parseFloat(a.volume))

      const totalVolume = markets.reduce(
        (sum: number, m: any) => sum + parseFloat(m.volume || '0'), 0
      )

      results.push({
        eventTicker: event.event_ticker,
        eventTitle: event.title,
        kalshiCategory: event.category,
        ourCategory: CATEGORY_MAP[event.category],
        marketCount: markets.length,
        totalVolume,
        isMutuallyExclusive: event.mutually_exclusive ?? false,
        markets,
      })

      for (const m of markets.slice(0, 3)) {
        console.log(`    ${m.marketTitle} | bid: ${m.yesBid} | vol: ${m.volume}`)
      }
    } catch (err) {
      console.error(`  Failed: ${err}`)
    }

    await delay(300)
  }

  results.sort((a, b) => b.totalVolume - a.totalVolume)

  writeFileSync(
    'testData/kalshiTestData.json',
    JSON.stringify(results, null, 2)
  )

  console.log(`\nSaved ${results.length} events`)
  console.log('\nTop 10 by volume:')
  for (const r of results.slice(0, 10)) {
    const exclusive = r.isMutuallyExclusive ? 'ME' : 'NME'
    console.log(`  [${r.ourCategory}] [${exclusive}] ${r.eventTitle} (${r.marketCount} markets, vol: ${r.totalVolume.toFixed(0)})`)
  }
}

main().catch(console.error)
