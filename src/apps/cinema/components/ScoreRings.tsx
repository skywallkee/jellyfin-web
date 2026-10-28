import React, { type CSSProperties, type FC } from 'react';

import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface RingProps {
    /** 0 to 1: how much of the ring fills. */
    fraction: number;
    value: string;
    label: string;
    /** Ring colour, as an "r, g, b" string. */
    rgb: string;
    index: number;
}

const Ring: FC<RingProps> = ({ fraction, value, label, rgb, index }) => (
    <div
        className='cinema-score'
        style={{
            '--cinema-score-rgb': rgb,
            '--cinema-score-offset': (CIRCUMFERENCE * (1 - fraction)).toFixed(1),
            '--cinema-score-length': CIRCUMFERENCE.toFixed(1),
            '--cinema-i': index
        } as CSSProperties}
    >
        <svg viewBox='0 0 64 64' aria-hidden='true'>
            <circle className='cinema-score__track' cx='32' cy='32' r={RADIUS} />
            <circle className='cinema-score__fill' cx='32' cy='32' r={RADIUS} />
        </svg>
        <span className='cinema-score__value'>{value}</span>
        <span className='cinema-score__label'>{label}</span>
    </div>
);

/** Red for poor scores through amber to green for great ones. */
const getScoreRgb = (fraction: number) => {
    if (fraction >= 0.7) return '74, 222, 128';
    if (fraction >= 0.5) return '250, 204, 21';
    return '248, 113, 113';
};

/** Community and critic scores as rings that draw themselves in when the details open. */
const ScoreRings: FC<{ item: ItemDto }> = ({ item }) => {
    const rings: Omit<RingProps, 'index'>[] = [];
    if (item.CommunityRating) {
        const fraction = Math.min(1, item.CommunityRating / 10);
        rings.push({
            fraction,
            value: item.CommunityRating.toFixed(1),
            label: globalize.translate('CommunityRating'),
            rgb: getScoreRgb(fraction)
        });
    }
    if (item.CriticRating) {
        const fraction = Math.min(1, item.CriticRating / 100);
        rings.push({
            fraction,
            value: `${Math.round(item.CriticRating)}%`,
            label: globalize.translate('CriticRating'),
            rgb: getScoreRgb(fraction)
        });
    }
    if (!rings.length) return null;

    return (
        <div className='cinema-scores'>
            {rings.map((ring, index) => <Ring key={ring.label} {...ring} index={index} />)}
        </div>
    );
};

export default ScoreRings;
