import React, { type FC, useEffect, useState } from 'react';

import { prefersReducedMotion } from '../utils/clip';
import { playSound } from '../utils/sounds';

const SESSION_KEY = 'cinema-intro-shown';
/** Full length of the intro, matching the animations in the styles. */
const INTRO_MS = 2300;
/** When the splash starts dissolving into the app. */
const OUTRO_AT_MS = 1700;
/** The name, letter by letter, each with its place in the stagger. */
const BRAND_LETTERS = [ ...'Jellyfin' ].map((letter, order) => ({ letter, order }));

const hasPlayedThisVisit = () => {
    try {
        return window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
        return false;
    }
};

const markPlayed = () => {
    try {
        window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
        // Without storage it may play again on the next load, which is harmless
    }
};

/**
 * A short opening when the app is first opened in a visit: the mark ignites, the name fans out
 * letter by letter, and the splash dissolves into the home screen. Any key or click skips it.
 */
const IntroSplash: FC = () => {
    const [ phase, setPhase ] = useState<'in' | 'out' | 'done'>(() => (
        hasPlayedThisVisit() || prefersReducedMotion() ? 'done' : 'in'
    ));

    const isDone = phase === 'done';

    useEffect(() => {
        if (isDone) return;
        markPlayed();
        playSound('select');
        const outTimer = window.setTimeout(() => setPhase('out'), OUTRO_AT_MS);
        const doneTimer = window.setTimeout(() => setPhase('done'), INTRO_MS);
        const skip = () => setPhase('done');
        window.addEventListener('keydown', skip, { once: true });
        window.addEventListener('pointerdown', skip, { once: true });
        return () => {
            window.clearTimeout(outTimer);
            window.clearTimeout(doneTimer);
            window.removeEventListener('keydown', skip);
            window.removeEventListener('pointerdown', skip);
        };
    // Runs once for the intro; the "out" phase only moves it along
    }, [ isDone ]);

    if (isDone) return null;

    return (
        <div className={phase === 'out' ? 'cinema-intro is-leaving' : 'cinema-intro'} aria-hidden='true'>
            <div className='cinema-intro__flare' />
            <div className='cinema-intro__lockup'>
                <span className='cinema-intro__mark' />
                <span className='cinema-intro__name'>
                    {BRAND_LETTERS.map(({ letter, order }) => (
                        <span key={order} style={{ '--cinema-i': order } as React.CSSProperties}>{letter}</span>
                    ))}
                </span>
            </div>
        </div>
    );
};

export default IntroSplash;
