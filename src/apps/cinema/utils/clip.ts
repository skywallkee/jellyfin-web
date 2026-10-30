import type { Api } from '@jellyfin/sdk/lib/api';
import { type RefObject, useEffect, useRef, useState } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

const TICKS_PER_SECOND = 10_000_000;

/** Where in the title a clip starts, as a fraction of its runtime: past the opening credits. */
const DEFAULT_START_FRACTION = 0.2;

/** Whether the item is a single video file a clip can be cut from (not a show or season). */
export const canPlayClip = (item?: ItemDto | null) => Boolean(item?.Id && item.MediaType === 'Video');

/** Whether the user asked the system for less motion. */
export const prefersReducedMotion = () => (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
);

/**
 * A direct stream of the original file, started part-way in. If the browser can't play the
 * format, the <video> errors quietly and the artwork simply stays up.
 */
export const getClipUrl = (api: Api, item: ItemDto, startFraction = DEFAULT_START_FRACTION) => {
    const startSeconds = Math.floor(((item.RunTimeTicks ?? 0) / TICKS_PER_SECOND) * startFraction);
    return `${api.basePath}/Videos/${item.Id}/stream?static=true&api_key=${api.accessToken}#t=${startSeconds}`;
};

/** Clips that want to play, newest last. Only the newest one plays; the rest wait their turn. */
const clipQueue: symbol[] = [];
const clipListeners = new Set<() => void>();

const notifyClips = () => {
    for (const listener of clipListeners) listener();
};

/**
 * Takes a turn to play a clip. Video decoding is heavy, so only one clip runs at once: a hover
 * preview or an opened details card pauses the hero's clip until it closes.
 * Returns whether it's this clip's turn.
 */
export const useClipTurn = (wantsToPlay: boolean) => {
    const idRef = useRef(Symbol('clip'));
    const [ isTurn, setIsTurn ] = useState(false);

    useEffect(() => {
        if (!wantsToPlay) return;
        const id = idRef.current;
        const update = () => setIsTurn(clipQueue[clipQueue.length - 1] === id);
        clipListeners.add(update);
        clipQueue.push(id);
        notifyClips();
        return () => {
            clipListeners.delete(update);
            const index = clipQueue.indexOf(id);
            if (index >= 0) clipQueue.splice(index, 1);
            setIsTurn(false);
            notifyClips();
        };
    }, [ wantsToPlay ]);

    return wantsToPlay && isTurn;
};

/** Whether an element is at least partly on screen; clips pause when scrolled away. */
export const useIsOnScreen = (ref: RefObject<HTMLElement>, isEnabled: boolean) => {
    const [ isOnScreen, setIsOnScreen ] = useState(true);
    useEffect(() => {
        const element = ref.current;
        if (!isEnabled || !element || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([ entry ]) => setIsOnScreen(entry.intersectionRatio > 0.15), {
            threshold: [ 0, 0.15, 0.5 ]
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ isEnabled, ref ]);
    return isOnScreen;
};

/** Whether the browser tab is showing; clips and music pause while it's in the background. */
export const usePageVisible = () => {
    // (Page visibility is supported by every browser Cinema runs in)
    // eslint-disable-next-line compat/compat
    const [ isVisible, setIsVisible ] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
    useEffect(() => {
        // eslint-disable-next-line compat/compat
        const update = () => setIsVisible(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);
    return isVisible;
};
