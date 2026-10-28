import { useEffect } from 'react';

type IdleWindow = Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
};

/**
 * Runs a task when the browser has nothing more urgent to do (or after `timeout` at the latest).
 * Returns a function that cancels it.
 */
export const runWhenIdle = (task: () => void, timeout = 2000) => {
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
        const handle = idleWindow.requestIdleCallback(task, { timeout });
        return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(task, Math.min(timeout, 300));
    return () => window.clearTimeout(timer);
};

/** How long after the last scroll event the page counts as still. */
const SCROLL_SETTLE_MS = 160;

/**
 * Marks the page with `cinema-scrolling` while it scrolls. The styles use it to pause
 * decorative motion (aurora, film grain, artwork drift) and hover effects, so scrolling
 * gets the whole frame budget.
 */
export const useScrollingFlag = () => {
    useEffect(() => {
        const root = document.documentElement;
        let timer = 0;
        let isScrolling = false;
        const onScroll = () => {
            if (!isScrolling) {
                isScrolling = true;
                root.classList.add('cinema-scrolling');
            }
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                isScrolling = false;
                root.classList.remove('cinema-scrolling');
            }, SCROLL_SETTLE_MS);
        };
        // Capture, so scrolling rows and panels count too
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll, { capture: true });
            window.clearTimeout(timer);
            root.classList.remove('cinema-scrolling');
        };
    }, []);
};

/**
 * Parts of the app that aren't needed for the first screen are split off and loaded on demand.
 * Once the app has settled, fetch them quietly so they open instantly the first time too.
 */
const PREFETCHES = [
    () => import(/* webpackChunkName: "cinema-details" */ '../features/details/DetailsView'),
    () => import(/* webpackChunkName: "cinema-quicksearch" */ '../components/QuickSearchPalette'),
    () => import(/* webpackChunkName: "cinema-surprise" */ '../components/SurpriseReel'),
    () => import(/* webpackChunkName: "cinema-settings-panel" */ '../components/SettingsPanel')
];

/** Delay after start before background loading begins, so it never competes with the first screen. */
const PREFETCH_DELAY_MS = 2500;

export const useIdlePrefetch = (isEnabled: boolean) => {
    useEffect(() => {
        if (!isEnabled) return;
        let cancelIdle: (() => void) | undefined;
        let index = 0;
        // One chunk per idle slot, so a slow device spreads the work out
        const next = () => {
            const prefetch = PREFETCHES[index++];
            if (!prefetch) return;
            prefetch().catch(() => { /* loaded again on first use */ }).finally(() => {
                cancelIdle = runWhenIdle(next);
            });
        };
        const timer = window.setTimeout(() => {
            cancelIdle = runWhenIdle(next);
        }, PREFETCH_DELAY_MS);
        return () => {
            window.clearTimeout(timer);
            cancelIdle?.();
        };
    }, [ isEnabled ]);
};
