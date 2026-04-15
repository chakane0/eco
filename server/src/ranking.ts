/*
    Selects and ranks markets by trading volume
    Used by the api and insight generator to surface the most active markets
*/

import type { MarketSnapshot } from './types.js';

export function selectTopMarkets(
    markets: MarketSnapshot[],
    limit: number = 20
): MarketSnapshot[] {
    return [...markets].sort((a, b) => b.volume - a.volume).slice(0, limit);
};