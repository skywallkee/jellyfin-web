import type { ItemDto } from 'types/base/models/item-dto';

const TICKS_PER_HOUR = 36_000_000_000;

export interface TopEntry {
    name: string;
    count: number;
    /** A title to show artwork for (the series, or the first title in that genre). */
    item?: ItemDto;
}

export interface YearRecap {
    year: number;
    titles: number;
    movies: number;
    episodes: number;
    hours: number;
    topGenre?: TopEntry;
    topShow?: TopEntry;
    busiestMonth?: { month: number; count: number };
    first?: ItemDto;
    latest?: ItemDto;
}

/** Time watched for a title: all of it if finished, else as far as it got. */
const getWatchedTicks = (item: ItemDto) => {
    if (item.UserData?.Played) return (item.RunTimeTicks ?? 0) * Math.max(1, item.UserData.PlayCount ?? 1);
    return item.UserData?.PlaybackPositionTicks ?? 0;
};

const countBy = <K>(values: K[]) => {
    const counts = new Map<K, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [ ...counts.entries() ].sort((a, b) => b[1] - a[1]);
};

/**
 * A year's highlights from the watch history: how much, what kind, which show,
 * which month, and the first and latest titles of the year.
 */
export const buildYearRecap = (history: ItemDto[], year: number, series: Map<string, ItemDto> = new Map()): YearRecap => {
    const items = history.filter(item => item.UserData?.LastPlayedDate && new Date(item.UserData.LastPlayedDate).getFullYear() === year);
    const episodes = items.filter(item => item.Type === 'Episode');

    const genres = items.flatMap(item => {
        if (item.Genres?.length) return item.Genres;
        return series.get(item.SeriesId ?? '')?.Genres ?? [];
    });
    const [ topGenreName, topGenreCount ] = countBy(genres)[0] ?? [];
    const [ topShowId, topShowCount ] = countBy(episodes.map(item => item.SeriesId ?? '').filter(Boolean))[0] ?? [];
    const [ busiestMonth, busiestCount ] = countBy(items.map(item => new Date(item.UserData?.LastPlayedDate ?? 0).getMonth()))[0] ?? [];
    const topShowEpisode = episodes.find(item => item.SeriesId === topShowId);
    const byDate = [ ...items ].sort((a, b) => (
        new Date(a.UserData?.LastPlayedDate ?? 0).getTime() - new Date(b.UserData?.LastPlayedDate ?? 0).getTime()
    ));

    return {
        year,
        titles: items.length,
        movies: items.length - episodes.length,
        episodes: episodes.length,
        hours: items.reduce((sum, item) => sum + getWatchedTicks(item), 0) / TICKS_PER_HOUR,
        topGenre: topGenreName ? {
            name: topGenreName,
            count: topGenreCount ?? 0,
            item: items.find(item => (item.Genres ?? series.get(item.SeriesId ?? '')?.Genres ?? []).includes(topGenreName))
        } : undefined,
        topShow: topShowId ? {
            name: topShowEpisode?.SeriesName ?? '',
            count: topShowCount ?? 0,
            item: series.get(topShowId) ?? topShowEpisode
        } : undefined,
        busiestMonth: busiestMonth != null ? { month: busiestMonth, count: busiestCount ?? 0 } : undefined,
        first: byDate[0],
        latest: byDate[byDate.length - 1]
    };
};
