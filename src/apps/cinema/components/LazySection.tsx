import classNames from 'classnames';
import React, { type FC, type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { runWhenIdle } from '../hooks/usePerformance';

import type { CardShape } from './MediaCard';

/** How far ahead of the screen a section starts loading as the user scrolls towards it. */
const LOOK_AHEAD = '700px 0px';
/** Time after the first screen appears before off-screen sections start loading in the background. */
const BACKGROUND_START_MS = 1200;
const SKELETON_CARDS = 6;

/** Sections waiting to load in the background, in page order. */
const queue: (() => void)[] = [];
let isDraining = false;
let backgroundReadyAt = 0;

/** Loads waiting sections one per idle moment, so the background work never competes with the user. */
const drain = () => {
    if (isDraining) return;
    isDraining = true;
    const wait = Math.max(0, backgroundReadyAt - Date.now());
    window.setTimeout(() => {
        const next = () => {
            const load = queue.shift();
            if (!load) {
                isDraining = false;
                return;
            }
            load();
            runWhenIdle(next, 1500);
        };
        runWhenIdle(next, 1500);
    }, wait);
};

interface LazySectionProps {
    /** Shape of the placeholder cards, to match the row that will appear. */
    shape?: CardShape;
    /**
     * Show a skeleton row while waiting. Off for sections that may turn out empty (like Favourites),
     * so a placeholder never appears only to vanish.
     */
    hasPlaceholder?: boolean;
}

/**
 * Holds off rendering (and fetching) a section of the page until it's needed: straight away when the
 * user scrolls near it, otherwise quietly in the background shortly after the page has loaded.
 * Shows a placeholder of about the same size meanwhile, so the page doesn't jump.
 */
const LazySection: FC<PropsWithChildren<LazySectionProps>> = ({ shape = 'poster', hasPlaceholder = true, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [ isReady, setIsReady ] = useState(false);

    useEffect(() => {
        if (isReady) return;
        const element = ref.current;
        const load = () => setIsReady(true);

        // Without IntersectionObserver (very old browsers), just render everything
        if (!element || typeof IntersectionObserver === 'undefined') {
            load();
            return;
        }

        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) load();
        }, { rootMargin: LOOK_AHEAD });
        observer.observe(element);

        backgroundReadyAt ||= Date.now() + BACKGROUND_START_MS;
        queue.push(load);
        drain();

        return () => {
            observer.disconnect();
            const index = queue.indexOf(load);
            if (index >= 0) queue.splice(index, 1);
        };
    }, [ isReady ]);

    // Children may be a single element or several; the fragment keeps the return type consistent
    // eslint-disable-next-line react/jsx-no-useless-fragment
    if (isReady) return <>{children}</>;
    if (!hasPlaceholder) return <div ref={ref} className='cinema-lazy-sentinel' aria-hidden='true' />;

    return (
        <div ref={ref} className='cinema-row cinema-row--placeholder' aria-hidden='true'>
            <span className='cinema-row__title cinema-row__title--placeholder cinema-skeleton' />
            <div className='cinema-row__track'>
                {Array.from({ length: SKELETON_CARDS }, (_, i) => (
                    <span key={i} className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)} />
                ))}
            </div>
        </div>
    );
};

export default LazySection;
