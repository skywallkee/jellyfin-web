import { describe, expect, it } from 'vitest';

import { findNext } from './useSpatialNavigation';

/** Creates an element whose bounding box is fixed, since jsdom has no layout. */
const box = (left: number, top: number, width = 100, height = 100) => {
    const el = document.createElement('a');
    el.getBoundingClientRect = () => ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({})
    });
    return el;
};

describe('findNext', () => {
    // Two rows of cards:   a b c
    //                      d e f
    const a = box(0, 0);
    const b = box(120, 0);
    const c = box(240, 0);
    const d = box(0, 200);
    const e = box(120, 200);
    const f = box(240, 200);
    const all = [ a, b, c, d, e, f ];

    it('moves to the nearest neighbour in each direction', () => {
        expect(findNext(b, 'right', all)).toBe(c);
        expect(findNext(b, 'left', all)).toBe(a);
        expect(findNext(b, 'down', all)).toBe(e);
        expect(findNext(e, 'up', all)).toBe(b);
    });

    it('prefers staying in line over a diagonal jump', () => {
        expect(findNext(a, 'down', all)).toBe(d);
    });

    it('returns nothing at the edge', () => {
        expect(findNext(c, 'right', all, true)).toBeUndefined();
        expect(findNext(a, 'up', all)).toBeUndefined();
    });

    it('keeps left and right within the row when sameRowOnly is set', () => {
        // A lone card lower down and to the right should not be reachable sideways from the first row
        const stray = box(400, 150);
        expect(findNext(c, 'right', [ ...all, stray ], true)).toBeUndefined();
        expect(findNext(c, 'right', [ ...all, stray ])).toBe(stray);
    });

    it('treats a wide target directly above as in line, even when its centre is far away', () => {
        // A small card under the left edge of a wide list row, with a narrow tab further up but directly in line
        const card = box(0, 500, 80, 80);
        const wideRow = box(0, 300, 800, 80);
        const tab = box(0, 0, 80, 40);
        expect(findNext(card, 'up', [ card, wideRow, tab ])).toBe(wideRow);
    });

    it('ignores the element itself and its ancestors', () => {
        const parent = box(0, 0, 400, 400);
        const child = box(10, 10, 50, 50);
        parent.appendChild(child);
        expect(findNext(child, 'right', [ parent, child ])).toBeUndefined();
    });
});
