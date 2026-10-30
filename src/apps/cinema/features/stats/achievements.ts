import type { ItemDto } from 'types/base/models/item-dto';

/** What the achievements are measured on, worked out from the watch history. */
export interface AchievementFacts {
    movies: number;
    episodes: number;
    hours: number;
    favorites: number;
    /** Different genres among everything watched. */
    genres: number;
    /** Different decades the watched titles come from. */
    decades: number;
    /** Titles last watched between midnight and 5 am. */
    lateNights: number;
    /** The most times any one title was played. */
    mostReplays: number;
}

export type AchievementKey =
    | 'first' | 'buff' | 'cinephile' | 'binge' | 'marathon'
    | 'explorer' | 'traveler' | 'owl' | 'rewatcher' | 'collector';

export interface Achievement {
    key: AchievementKey;
    value: number;
    goal: number;
    isUnlocked: boolean;
    /** 0 to 1, how close it is. */
    progress: number;
}

const GOALS: { key: AchievementKey; goal: number; measure: (facts: AchievementFacts) => number }[] = [
    { key: 'first', goal: 1, measure: facts => facts.movies + facts.episodes },
    { key: 'buff', goal: 25, measure: facts => facts.movies },
    { key: 'cinephile', goal: 100, measure: facts => facts.movies },
    { key: 'binge', goal: 50, measure: facts => facts.episodes },
    { key: 'marathon', goal: 100, measure: facts => Math.floor(facts.hours) },
    { key: 'explorer', goal: 10, measure: facts => facts.genres },
    { key: 'traveler', goal: 5, measure: facts => facts.decades },
    { key: 'owl', goal: 5, measure: facts => facts.lateNights },
    { key: 'rewatcher', goal: 3, measure: facts => facts.mostReplays },
    { key: 'collector', goal: 10, measure: facts => facts.favorites }
];

/** Every achievement with how far along it is; unlocked ones first, then the closest to unlocking. */
export const buildAchievements = (facts: AchievementFacts): Achievement[] => GOALS
    .map(({ key, goal, measure }) => {
        const value = Math.max(0, measure(facts));
        return { key, goal, value, isUnlocked: value >= goal, progress: Math.min(1, value / goal) };
    })
    .sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked) || b.progress - a.progress);

const LATE_NIGHT_END_HOUR = 5;

/** The facts that need the watched titles themselves (the rest come from simple counts). */
export const getHistoryFacts = (watched: ItemDto[]) => {
    const genres = new Set<string>();
    const decades = new Set<number>();
    let lateNights = 0;
    let mostReplays = 0;
    for (const item of watched) {
        for (const genre of item.Genres ?? []) genres.add(genre);
        if (item.ProductionYear) decades.add(Math.floor(item.ProductionYear / 10) * 10);
        const lastPlayed = item.UserData?.LastPlayedDate;
        if (lastPlayed && new Date(lastPlayed).getHours() < LATE_NIGHT_END_HOUR) lateNights += 1;
        mostReplays = Math.max(mostReplays, item.UserData?.PlayCount ?? 0);
    }
    return { genres: genres.size, decades: decades.size, lateNights, mostReplays };
};
