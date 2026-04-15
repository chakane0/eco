/*
    Calculates trend direction and magnitude from market price changes
    Returns up/down/stable and the percentage change between current and previous
*/

import type { TrendDirection } from './types.js';

interface TrendResult {
    direction: TrendDirection
    percent: number
};

export function calculateTrend(currentPrice: number, previousPrice: number): TrendResult {
    const diff = currentPrice - previousPrice;
    const percent = diff * 100;

    let direction: TrendDirection;
    if(diff > 0) {
        direction = 'up';
    } else if (diff < 0) {
        direction = 'down';
    } else {
        direction = 'stable';
    }

    return { direction, percent };
};

