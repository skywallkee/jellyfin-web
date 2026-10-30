export type SeasonKey = 'halloween' | 'holidays' | 'valentine' | 'summer';

export interface SeasonalEvent {
    key: SeasonKey;
    /** First and last day, as [month (1-12), day]. */
    from: [number, number];
    to: [number, number];
    /** Genres that fit the occasion (any one is enough). */
    genres: string[];
}

export const SEASONS: SeasonalEvent[] = [
    { key: 'valentine', from: [ 2, 7 ], to: [ 2, 15 ], genres: [ 'Romance' ] },
    { key: 'summer', from: [ 7, 1 ], to: [ 8, 31 ], genres: [ 'Adventure', 'Action', 'Comedy' ] },
    { key: 'halloween', from: [ 10, 1 ], to: [ 11, 1 ], genres: [ 'Horror', 'Thriller', 'Mystery', 'Fantasy' ] },
    { key: 'holidays', from: [ 12, 1 ], to: [ 12, 31 ], genres: [ 'Family', 'Comedy', 'Romance', 'Animation' ] }
];

/** Month and day as one comparable number, e.g. 31 October is 1031. */
const toDayNumber = ([ month, day ]: [number, number]) => month * 100 + day;

/** The occasion today falls in, if any. */
export const getActiveSeason = (now = new Date()): SeasonalEvent | undefined => {
    const today = toDayNumber([ now.getMonth() + 1, now.getDate() ]);
    return SEASONS.find(season => today >= toDayNumber(season.from) && today <= toDayNumber(season.to));
};
