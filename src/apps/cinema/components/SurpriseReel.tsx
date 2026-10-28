import classNames from 'classnames';
import React, { type CSSProperties, type FC, useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { getPosterUrl } from '../utils/images';
import { getDisplayTitle } from '../utils/items';
import { playSound } from '../utils/sounds';

/** Posters in the reel; the winner sits near the end so the spin has a long run-up. */
const REEL_LENGTH = 34;
const WINNER_INDEX = REEL_LENGTH - 4;
const POSTER_WIDTH = 150;
const POSTER_GAP = 18;
const SPIN_MS = 3400;
/** How long the winner is shown before its details open. */
const REVEAL_MS = 1200;
const TICK_COUNT = 22;

/** Ticks that slow down with the reel, like a wheel clicking past its pegs. */
const scheduleTicks = () => {
    const timers: number[] = [];
    for (let i = 1; i <= TICK_COUNT; i++) {
        // Ease-out timing: ticks bunch up at the start and spread out as the reel slows
        const progress = 1 - Math.pow(1 - i / TICK_COUNT, 0.45);
        timers.push(window.setTimeout(() => playSound('move'), progress * SPIN_MS));
    }
    return () => {
        for (const timer of timers) window.clearTimeout(timer);
    };
};

/** The spinning reel of posters. Loaded the first time Surprise me is used. */
const Reel: FC<{ pool: ItemDto[]; onDone: (item: ItemDto) => void; onClose: () => void }> = ({ pool, onDone, onClose }) => {
    const { api } = useApi();
    const [ phase, setPhase ] = useState<'ready' | 'spinning' | 'landed'>('ready');
    const reel = Array.from({ length: REEL_LENGTH }, (_, i) => pool[i % pool.length]);
    const winner = reel[WINNER_INDEX];

    useEffect(() => {
        // Let the reel paint at its start position before it starts moving
        const start = window.setTimeout(() => setPhase('spinning'), 60);
        const land = window.setTimeout(() => {
            setPhase('landed');
            playSound('select');
        }, SPIN_MS + 80);
        const done = window.setTimeout(() => onDone(winner), SPIN_MS + REVEAL_MS);
        const stopTicks = scheduleTicks();
        return () => {
            for (const timer of [ start, land, done ]) window.clearTimeout(timer);
            stopTicks();
        };
    }, [ onDone, winner ]);

    const offset = WINNER_INDEX * (POSTER_WIDTH + POSTER_GAP) + POSTER_WIDTH / 2;

    return (
        <div className={classNames('cinema-surprise', `is-${phase}`)} role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaSurpriseMe')}>
            <button type='button' className='cinema-surprise__scrim' tabIndex={-1} aria-hidden='true' onClick={onClose} />
            <p className='cinema-surprise__eyebrow'>{globalize.translate('CinemaPicking')}</p>
            <div className='cinema-surprise__window'>
                <div
                    className='cinema-surprise__reel'
                    style={{
                        '--cinema-reel-x': `${-offset}px`,
                        '--cinema-spin-ms': `${SPIN_MS}ms`,
                        gap: POSTER_GAP
                    } as CSSProperties}
                >
                    {reel.map((item, i) => {
                        const url = api ? getPosterUrl(api, item, 300) : undefined;
                        return (
                            <span
                                // The reel repeats titles, so position is the identity here
                                // eslint-disable-next-line react/no-array-index-key
                                key={i}
                                className={classNames('cinema-surprise__poster', { 'is-winner': i === WINNER_INDEX })}
                                style={{ width: POSTER_WIDTH, backgroundImage: url ? `url("${url}")` : undefined }}
                            >
                                {!url && getDisplayTitle(item)}
                            </span>
                        );
                    })}
                </div>
            </div>
            <p className='cinema-surprise__title' aria-live='polite'>
                {phase === 'landed' ? getDisplayTitle(winner) : ' '}
            </p>
        </div>
    );
};

export default Reel;
