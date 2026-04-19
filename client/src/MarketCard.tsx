/*
    Renders a single prediction market as a card with probability, trend, and insight
    Handles the case where no AI insight is available
*/

import type { MarketWithInsight } from './api';
import styles from '../src/Styles/MarketCard.module.css';

interface Props {
    market: MarketWithInsight
};

export function MarketCard({market}: Props) {
    const probability = Math.round(market.currentPrice * 100);
    const arrow = market.trend === 'up' ? '↑' : market.trend === 'down' ? '↓' : '→';
    const trendClass = market.trend === 'up' ? styles.trendUp : market.trend === 'down' ? styles.trendDown : styles.trendStable;

    return (
        <div className={styles.card}>
            <h3 className={styles.title}>
                {market.title}
            </h3>
            <div className={styles.stats}>
                probability
                <span className={styles.probability}>{probability}%</span>
                <span className={`${styles.trend} ${trendClass}`}>{arrow} {Math.abs(market.trendPercent).toFixed(1)}%</span>
            </div>
            {market.insight && (
                <p className={styles.insight}>{market.insight}</p>
            )}
        </div>
    )
}