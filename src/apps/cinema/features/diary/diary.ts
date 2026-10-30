/** One watch, logged: when, how many stars, and a few words about it. */
export interface DiaryEntry {
    id: string;
    itemId: string;
    /** Kept so the entry still reads well if the title leaves the library. */
    title: string;
    /** The day it was watched, as YYYY-MM-DD (a calendar day, not a moment in time). */
    date: string;
    /** 0.5 to 5 in half steps; 0 when not rated. */
    stars: number;
    note?: string;
    isRewatch?: boolean;
}

export const MAX_STARS = 5;
export const STAR_STEP = 0.5;
export const MAX_NOTE = 500;

/** Today as YYYY-MM-DD, in local time. */
export const getToday = (now = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** A YYYY-MM-DD day as a local date (not UTC, which can land on the day before). */
export const parseDay = (day: string) => {
    const [ year, month, date ] = day.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, date ?? 1);
};

/** Rounds to the nearest half star, within 0 to 5. */
export const clampStars = (stars: number) => Math.min(MAX_STARS, Math.max(0, Math.round(stars / STAR_STEP) * STAR_STEP));

/** Newest first; for the same day, the most recently logged first. */
export const sortEntries = (entries: DiaryEntry[]) => [ ...entries ].sort((a, b) => (
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
));

/** Entries grouped by month (YYYY-MM), newest month first. */
export const groupByMonth = (entries: DiaryEntry[]) => {
    const months: { month: string; entries: DiaryEntry[] }[] = [];
    for (const entry of sortEntries(entries)) {
        const month = entry.date.slice(0, 7);
        const last = months[months.length - 1];
        if (last?.month === month) last.entries.push(entry);
        else months.push({ month, entries: [ entry ] });
    }
    return months;
};

/** How many entries got each star rating, from half a star to five (ten bars). */
export const getRatingSpread = (entries: DiaryEntry[]) => {
    const counts = Array.from({ length: MAX_STARS / STAR_STEP }, () => 0);
    for (const entry of entries) {
        if (entry.stars > 0) counts[Math.round(entry.stars / STAR_STEP) - 1] += 1;
    }
    return counts;
};

/** Average of the rated entries, or undefined when none are rated. */
export const getAverageStars = (entries: DiaryEntry[]) => {
    const rated = entries.filter(entry => entry.stars > 0);
    if (!rated.length) return undefined;
    return rated.reduce((sum, entry) => sum + entry.stars, 0) / rated.length;
};

let idCounter = 0;

/** A new id that sorts after earlier ones (the counter keeps two in the same millisecond apart). */
export const makeEntryId = (now = Date.now()) => {
    idCounter = (idCounter + 1) % 1296;
    return `${now.toString(36).padStart(9, '0')}${idCounter.toString(36).padStart(2, '0')}`;
};
