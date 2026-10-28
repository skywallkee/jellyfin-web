import { decode } from 'blurhash';
import { useEffect, useState } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

const BASE83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

const decode83 = (text: string) => {
    let value = 0;
    for (const char of text) {
        const digit = BASE83.indexOf(char);
        if (digit < 0) return undefined;
        value = value * 83 + digit;
    }
    return value;
};

export type Rgb = readonly [number, number, number];

/** The average colour of an image, read straight from its BlurHash (characters 2–5 hold it). */
export const getBlurhashColor = (hash?: string | null): Rgb | undefined => {
    if (!hash || hash.length < 6) return undefined;
    const value = decode83(hash.substring(2, 6));
    if (value === undefined) return undefined;
    return [ value >> 16, (value >> 8) & 255, value & 255 ];
};

type HashKind = 'Backdrop' | 'Primary' | 'Thumb';

/** The BlurHash of an item's image, looked up by tag; falls back to any hash of that kind. */
export const getItemBlurhash = (item: ItemDto, kind: HashKind, tag?: string | null) => {
    const hashes = item.ImageBlurHashes?.[kind];
    if (!hashes) return undefined;
    if (tag && hashes[tag]) return hashes[tag];
    return Object.values(hashes)[0];
};

/** A colour that represents the item's artwork: backdrop first, then the poster or thumb. */
export const getItemColor = (item?: ItemDto | null): Rgb | undefined => {
    if (!item) return undefined;
    return getBlurhashColor(
        getItemBlurhash(item, 'Backdrop', item.BackdropImageTags?.[0] ?? item.ParentBackdropImageTags?.[0])
        ?? getItemBlurhash(item, 'Primary', item.ImageTags?.Primary)
        ?? getItemBlurhash(item, 'Thumb', item.ImageTags?.Thumb)
    );
};

/** Lifts dark colours so a tint stays visible on the near-black background. */
export const brighten = ([ r, g, b ]: Rgb, minLightness = 120): Rgb => {
    const max = Math.max(r, g, b, 1);
    if (max >= minLightness) return [ r, g, b ];
    const factor = minLightness / max;
    return [ Math.round(r * factor), Math.round(g * factor), Math.round(b * factor) ];
};

export const toRgbString = (rgb: Rgb) => rgb.join(', ');

const BLUR_SIZE = 16;
const blurCache = new Map<string, string>();

/**
 * A tiny blurred preview of an image as a data URL, shown while the real image loads.
 * Cached, since the same artwork appears in several rows.
 */
export const getBlurDataUrl = (hash?: string | null) => {
    if (!hash || typeof document === 'undefined') return undefined;
    const cached = blurCache.get(hash);
    if (cached) return cached;
    try {
        const pixels = decode(hash, BLUR_SIZE, BLUR_SIZE);
        const canvas = document.createElement('canvas');
        canvas.width = BLUR_SIZE;
        canvas.height = BLUR_SIZE;
        const context = canvas.getContext('2d');
        if (!context) return undefined;
        const imageData = context.createImageData(BLUR_SIZE, BLUR_SIZE);
        imageData.data.set(pixels);
        context.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL();
        blurCache.set(hash, url);
        return url;
    } catch {
        // An invalid hash just means no preview
        return undefined;
    }
};

/** Placeholders waiting to be drawn, and who is waiting for each. */
const pending = new Map<string, Set<(url?: string) => void>>();
let isDrawScheduled = false;
/** Time allowed per idle slot, so drawing many placeholders never stalls a frame. */
const DRAW_BUDGET_MS = 6;

type IdleWindow = Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number };

const scheduleDraw = () => {
    if (isDrawScheduled) return;
    isDrawScheduled = true;
    const idleWindow = window as IdleWindow;
    const run = () => {
        isDrawScheduled = false;
        const start = performance.now();
        for (const [ hash, waiting ] of pending) {
            if (performance.now() - start > DRAW_BUDGET_MS) break;
            pending.delete(hash);
            const url = getBlurDataUrl(hash);
            for (const notify of waiting) notify(url);
        }
        if (pending.size) scheduleDraw();
    };
    if (idleWindow.requestIdleCallback) idleWindow.requestIdleCallback(run, { timeout: 200 });
    else window.setTimeout(run, 16);
};

/**
 * The blurred placeholder for a BlurHash. Ready straight away if it was drawn before;
 * otherwise drawn when the browser is idle, a few at a time, so a page of cards appears without a stall.
 */
export const useBlurDataUrl = (hash?: string | null) => {
    const [ url, setUrl ] = useState(() => (hash ? blurCache.get(hash) : undefined));

    useEffect(() => {
        if (!hash) return;
        const cached = blurCache.get(hash);
        if (cached) {
            setUrl(cached);
            return;
        }
        const notify = (next?: string) => setUrl(next);
        const waiting = pending.get(hash) ?? new Set();
        waiting.add(notify);
        pending.set(hash, waiting);
        scheduleDraw();
        return () => {
            waiting.delete(notify);
            if (!waiting.size) pending.delete(hash);
        };
    }, [ hash ]);

    return hash ? url : undefined;
};
