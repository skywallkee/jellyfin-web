import { describe, expect, it } from 'vitest';

import type { ItemDto } from 'types/base/models/item-dto';

import { buildYearRecap } from './recap';

const HOUR = 36_000_000_000;

const watched = (overrides: Partial<ItemDto>, date: string, played = true): ItemDto => ({
    RunTimeTicks: HOUR,
    ...overrides,
    UserData: { Played: played, PlayCount: played ? 1 : 0, LastPlayedDate: date, PlaybackPositionTicks: played ? 0 : HOUR / 2 }
} as ItemDto);

describe('buildYearRecap', () => {
    const history = [
        watched({ Id: 'm1', Type: 'Movie', Name: 'Film', Genres: [ 'Drama' ] }, '2026-03-02T20:00:00Z'),
        watched({ Id: 'e1', Type: 'Episode', SeriesId: 's1', SeriesName: 'Show' }, '2026-03-05T20:00:00Z'),
        watched({ Id: 'e2', Type: 'Episode', SeriesId: 's1', SeriesName: 'Show' }, '2026-07-01T20:00:00Z', false),
        watched({ Id: 'old', Type: 'Movie', Genres: [ 'Comedy' ] }, '2025-12-31T10:00:00Z')
    ];
    const series = new Map([ [ 's1', { Id: 's1', Name: 'Show', Genres: [ 'Drama', 'Mystery' ] } as ItemDto ] ]);

    it('only counts titles last watched in that year', () => {
        const recap = buildYearRecap(history, 2026, series);
        expect(recap.titles).toBe(3);
        expect(recap.movies).toBe(1);
        expect(recap.episodes).toBe(2);
    });

    it('adds finished runtimes and partial progress', () => {
        expect(buildYearRecap(history, 2026, series).hours).toBeCloseTo(2.5);
    });

    it('finds the top genre (using series genres for episodes), show and month', () => {
        const recap = buildYearRecap(history, 2026, series);
        expect(recap.topGenre?.name).toBe('Drama');
        expect(recap.topShow?.name).toBe('Show');
        expect(recap.topShow?.count).toBe(2);
        expect(recap.busiestMonth?.month).toBe(2);
    });

    it('picks the first and latest titles of the year', () => {
        const recap = buildYearRecap(history, 2026, series);
        expect(recap.first?.Id).toBe('m1');
        expect(recap.latest?.Id).toBe('e2');
    });

    it('copes with an empty year', () => {
        const recap = buildYearRecap(history, 2020, series);
        expect(recap.titles).toBe(0);
        expect(recap.topGenre).toBeUndefined();
        expect(recap.first).toBeUndefined();
    });
});
