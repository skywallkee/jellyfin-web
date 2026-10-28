import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import type { ItemDto } from 'types/base/models/item-dto';

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
