import { describe, expect, it } from 'vitest';

import type { ItemDto } from 'types/base/models/item-dto';

import { type AchievementFacts, buildAchievements, getHistoryFacts } from './achievements';

const NONE: AchievementFacts = {
    movies: 0, episodes: 0, hours: 0, favorites: 0, genres: 0, decades: 0, lateNights: 0, mostReplays: 0
};

describe('buildAchievements', () => {
    it('has nothing unlocked before anything is watched', () => {
        const achievements = buildAchievements(NONE);
        expect(achievements).toHaveLength(10);
        expect(achievements.every(a => !a.isUnlocked && a.progress === 0)).toBe(true);
    });

    it('unlocks at the goal, caps progress, and puts unlocked ones first', () => {
        const achievements = buildAchievements({ ...NONE, movies: 30, episodes: 10 });
        const byKey = Object.fromEntries(achievements.map(a => [ a.key, a ]));
        expect(byKey.first.isUnlocked).toBe(true);
        expect(byKey.buff.isUnlocked).toBe(true);
        expect(byKey.buff.progress).toBe(1);
        expect(byKey.cinephile.isUnlocked).toBe(false);
        expect(byKey.cinephile.progress).toBeCloseTo(0.3);
        expect(achievements[0].isUnlocked).toBe(true);
        expect(achievements[1].isUnlocked).toBe(true);
        // Then the closest to unlocking
        expect(achievements[2].key).toBe('cinephile');
    });
});

describe('getHistoryFacts', () => {
    it('counts genres, decades, late nights and replays', () => {
        const late = new Date(2026, 0, 2, 1, 30).toISOString();
        const evening = new Date(2026, 0, 2, 20, 0).toISOString();
        const items = [
            { Genres: [ 'Drama', 'Mystery' ], ProductionYear: 1994, UserData: { LastPlayedDate: late, PlayCount: 1 } },
            { Genres: [ 'Drama' ], ProductionYear: 1999, UserData: { LastPlayedDate: evening, PlayCount: 4 } },
            { Genres: [ 'Comedy' ], ProductionYear: 2021, UserData: { PlayCount: 2 } }
        ] as ItemDto[];
        expect(getHistoryFacts(items)).toEqual({ genres: 3, decades: 2, lateNights: 1, mostReplays: 4 });
    });
});
