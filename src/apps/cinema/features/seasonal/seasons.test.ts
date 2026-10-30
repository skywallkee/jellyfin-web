import { describe, expect, it } from 'vitest';

import { getActiveSeason } from './seasons';

describe('getActiveSeason', () => {
    it('finds the occasion for the day, including its first and last days', () => {
        expect(getActiveSeason(new Date(2026, 9, 29))?.key).toBe('halloween');
        expect(getActiveSeason(new Date(2026, 9, 1))?.key).toBe('halloween');
        expect(getActiveSeason(new Date(2026, 10, 1))?.key).toBe('halloween');
        expect(getActiveSeason(new Date(2026, 11, 24))?.key).toBe('holidays');
        expect(getActiveSeason(new Date(2027, 1, 14))?.key).toBe('valentine');
        expect(getActiveSeason(new Date(2026, 6, 15))?.key).toBe('summer');
    });

    it('has nothing on ordinary days', () => {
        expect(getActiveSeason(new Date(2026, 10, 2))).toBeUndefined();
        expect(getActiveSeason(new Date(2026, 3, 10))).toBeUndefined();
    });
});
