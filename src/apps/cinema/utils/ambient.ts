import { type RefObject, useEffect, useSyncExternalStore } from 'react';

import { brighten, type Rgb, toRgbString } from './blurhash';

/**
 * Who is asking for a tint, highest priority first: an open details card, then the card under the
 * pointer or remote focus, then the page, then the hero.
 */
export type AmbientSource = 'hero' | 'page' | 'focus' | 'modal';
const PRIORITY: AmbientSource[] = [ 'modal', 'focus', 'page', 'hero' ];

/** Tints per source, newest last: e.g. the end screen over a details card both tint as 'modal'. */
const tints = new Map<AmbientSource, { color: Rgb }[]>();
const colors = {
    has: (source: AmbientSource) => Boolean(tints.get(source)?.length),
    get: (source: AmbientSource) => {
        const list = tints.get(source) ?? [];
        return list[list.length - 1]?.color;
    },
    set: (source: AmbientSource, color: Rgb) => {
        tints.set(source, [ { color } ]);
    },
    delete: (source: AmbientSource) => {
        tints.delete(source);
    }
};

const pushTint = (source: AmbientSource, entry: { color: Rgb }) => {
    tints.set(source, [ ...(tints.get(source) ?? []), entry ]);
};

const removeTint = (source: AmbientSource, entry: { color: Rgb }) => {
    tints.set(source, (tints.get(source) ?? []).filter(other => other !== entry));
};
const listeners = new Set<() => void>();
let current: Rgb | undefined;
/** The same, but ignoring hover/focus: used for glows across the whole app, which are costly to change. */
let currentGlow: Rgb | undefined;

const pick = (sources: AmbientSource[]) => {
    const source = sources.find(key => colors.has(key));
    return source ? colors.get(source) : undefined;
};

const recompute = () => {
    const next = pick(PRIORITY);
    const nextGlow = pick(PRIORITY.filter(source => source !== 'focus'));
    if (next === current && nextGlow === currentGlow) return;
    current = next;
    currentGlow = nextGlow;
    for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** The colour the page's ambient glow should take right now, if any. */
export const useAmbientColor = () => useSyncExternalStore(subscribe, () => current);

/**
 * Keeps the app's glow colours (focus rings, button glows, progress bars) in the featured title's
 * colour by setting CSS variables straight on the element, so the app doesn't re-render for it.
 */
export const useGlowVars = (ref: RefObject<HTMLElement>) => {
    useEffect(() => {
        let applied: Rgb | undefined;
        const apply = () => {
            const element = ref.current;
            if (!element || currentGlow === applied) return;
            applied = currentGlow;
            if (!currentGlow) {
                element.style.removeProperty('--cinema-tint-rgb');
                element.style.removeProperty('--cinema-glow');
                element.style.removeProperty('--cinema-glow-soft');
                return;
            }
            const rgb = toRgbString(brighten(currentGlow, 170));
            element.style.setProperty('--cinema-tint-rgb', rgb);
            element.style.setProperty('--cinema-glow', `rgba(${rgb}, 0.55)`);
            element.style.setProperty('--cinema-glow-soft', `rgba(${rgb}, 0.35)`);
        };
        apply();
        return subscribe(apply);
    }, [ ref ]);
};

/** Tints the page's ambient glow with a colour while the calling component is mounted. */
export const useAmbientTint = (source: AmbientSource, color?: Rgb) => {
    const key = color?.join(',');
    useEffect(() => {
        if (!color) return;
        const entry = { color };
        pushTint(source, entry);
        recompute();
        return () => {
            removeTint(source, entry);
            recompute();
        };
    // The colour is compared by value, so a new array with the same colour doesn't flicker the glow
    }, [ source, key ]);
};

/** Short pause before a hovered card takes over the light, so sweeping across a row doesn't flicker. */
const FOCUS_IN_MS = 220;
/** And before the light goes back once nothing is hovered or focused. */
const FOCUS_OUT_MS = 500;
let focusTimer = 0;

/**
 * Lets the card under the pointer (or remote focus) colour the page's light, like a TV's
 * home screen that changes mood with the selected title. Pass nothing when it's left.
 */
export const setFocusTint = (color?: Rgb) => {
    window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => {
        if (color) colors.set('focus', color);
        else colors.delete('focus');
        recompute();
    }, color ? FOCUS_IN_MS : FOCUS_OUT_MS);
};
