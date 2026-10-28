import type { ItemDto } from 'types/base/models/item-dto';

const TICKS_PER_MINUTE = 600_000_000;

/** Formats a tick count as "2h 14m" or "48m". */
export const formatRuntime = (ticks?: number | null) => {
    if (!ticks) return undefined;
    // Never show "0m" for short clips
    const totalMinutes = Math.max(1, Math.round(ticks / TICKS_PER_MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
};

/** Minutes of playback remaining for a partially watched item. */
export const getRemainingTicks = (item: ItemDto) => {
    const position = item.UserData?.PlaybackPositionTicks;
    if (!position || !item.RunTimeTicks) return undefined;
    return Math.max(item.RunTimeTicks - position, 0);
};

export const getEpisodeLabel = (item: ItemDto) => {
    if (item.Type !== 'Episode') return undefined;
    const season = item.ParentIndexNumber;
    const episode = item.IndexNumber;
    if (season == null || episode == null) return undefined;
    return `S${season} E${episode}`;
};

/** The main title to show for an item. Episodes show their series name. */
export const getDisplayTitle = (item: ItemDto) => (
    item.Type === 'Episode' && item.SeriesName ? item.SeriesName : item.Name ?? ''
);

const getStreams = (item: ItemDto) => item.MediaStreams ?? item.MediaSources?.[0]?.MediaStreams ?? [];

const getChannelLabel = (channels?: number | null) => {
    if (!channels) return undefined;
    if (channels >= 8) return '7.1';
    if (channels >= 6) return '5.1';
    if (channels === 2) return '2.0';
    return undefined;
};

/** Short quality chips from the default streams, e.g. ["4K", "HDR10", "5.1"]. */
export const getQualityLabels = (item: ItemDto) => {
    const streams = getStreams(item);
    const video = streams.find(s => s.Type === 'Video');
    const audio = streams.find(s => s.Type === 'Audio' && s.IsDefault) ?? streams.find(s => s.Type === 'Audio');
    const labels: string[] = [];

    const height = video?.Height ?? 0;
    const width = video?.Width ?? 0;
    // Use the longer side too, so vertical and ultrawide videos are classed correctly
    const longSide = Math.max(width, height);
    if (longSide >= 3800) labels.push('4K');
    else if (longSide >= 1900) labels.push('HD');

    const range = video?.VideoRangeType ?? video?.VideoRange;
    if (range && range !== 'SDR' && range !== 'Unknown') labels.push(range);

    const channels = getChannelLabel(audio?.Channels);
    if (channels) labels.push(channels);

    return labels;
};

/** Distinct languages of the audio or subtitle streams, e.g. "ENG, RON". */
export const getStreamLanguages = (item: ItemDto, type: 'Audio' | 'Subtitle') => {
    const languages = new Set(
        getStreams(item)
            .filter(s => s.Type === type)
            .map(s => (s.Language ?? '').toUpperCase())
            .filter(Boolean)
    );
    return [ ...languages ].join(', ') || undefined;
};

/** Names of people with a given role, e.g. all directors. */
export const getPeopleNames = (item: ItemDto, type: string) => (
    (item.People ?? [])
        .filter(person => person.Type === type)
        .map(person => person.Name)
        .filter(Boolean)
        .join(', ') || undefined
);
