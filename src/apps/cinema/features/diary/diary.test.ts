import { describe, expect, it } from 'vitest';

import { type DiaryEntry, clampStars, getAverageStars, getRatingSpread, getToday, groupByMonth, makeEntryId, parseDay } from './diary';

const entry = (id: string, date: string, stars: number): DiaryEntry => ({ id, itemId: id, title: id, date, stars });

describe('diary helpers', () => {
    it('rounds stars to half steps within 0 to 5', () => {
        expect(clampStars(3.3)).toBe(3.5);
        expect(clampStars(3.2)).toBe(3);
        expect(clampStars(7)).toBe(5);
        expect(clampStars(-1)).toBe(0);
    });

    it('formats and reads calendar days in local time', () => {
        expect(getToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
        const day = parseDay('2026-03-09');
        expect([ day.getFullYear(), day.getMonth(), day.getDate() ]).toEqual([ 2026, 2, 9 ]);
    });

    it('groups by month, newest first', () => {
        const months = groupByMonth([
            entry('a', '2026-09-30', 3),
            entry('b', '2026-10-02', 4),
            entry('c', '2026-10-20', 5)
        ]);
        expect(months.map(m => m.month)).toEqual([ '2026-10', '2026-09' ]);
        expect(months[0].entries.map(e => e.id)).toEqual([ 'c', 'b' ]);
    });

    it('counts the rating spread and averages only rated entries', () => {
        const entries = [ entry('a', '2026-10-01', 0.5), entry('b', '2026-10-01', 5), entry('c', '2026-10-01', 5), entry('d', '2026-10-01', 0) ];
        const spread = getRatingSpread(entries);
        expect(spread).toHaveLength(10);
        expect(spread[0]).toBe(1);
        expect(spread[9]).toBe(2);
        expect(getAverageStars(entries)).toBeCloseTo(3.5);
        expect(getAverageStars([ entry('x', '2026-10-01', 0) ])).toBeUndefined();
    });

    it('makes ids that sort by time', () => {
        expect(makeEntryId(1000) < makeEntryId(2000)).toBe(true);
    });
});
