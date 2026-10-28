import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import type { ItemDto } from 'types/base/models/item-dto';

const TICKS_PER_MINUTE = 600_000_000;

/** Formats a tick count as "2h 14m" or "48m". */
export const formatRuntime = (ticks?: number | null) => {
    if (!ticks) return undefined;
    const totalMinutes = Math.round(ticks / TICKS_PER_MINUTE);
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

/** Hash route (without the leading "#") for an item's details page. */
export const getItemPath = (item: ItemDto) => appRouter.getRouteUrl(item).substring(1);

export const playItem = (item: ItemDto, resume: boolean) => {
    playbackManager.play({
        items: [ item ],
        startPositionTicks: resume ? item.UserData?.PlaybackPositionTicks ?? 0 : 0
    }).catch((err: unknown) => {
        console.error('[Cinema] failed to start playback', err);
    });
};
