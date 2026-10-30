import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';
import Events from 'utils/events';

const TICKS_PER_SECOND = 10_000_000;

/** The playing item, or nothing while no player is active (asking without one throws). */
const getCurrentItem = (): ItemDto | undefined => {
    const player = playbackManager.getCurrentPlayer();
    return player ? playbackManager.currentItem(player) ?? undefined : undefined;
};

/** The playback position in ms, or 0 while no player is active. */
const getCurrentMs = () => (playbackManager.getCurrentPlayer() ? playbackManager.currentTime() || 0 : 0);

/** What's playing right now, kept up to date as playback moves to another title. */
export const useNowPlaying = () => {
    const [ item, setItem ] = useState<ItemDto | undefined>(getCurrentItem);

    useEffect(() => {
        const update = () => setItem(getCurrentItem());
        update();
        Events.on(playbackManager, 'playbackstart', update);
        return () => Events.off(playbackManager, 'playbackstart', update);
    }, []);

    return item;
};

/** Playback position, in ticks, polled a couple of times a second while the player is open. */
export const usePlaybackPosition = (isEnabled: boolean) => {
    const [ ticks, setTicks ] = useState(0);
    useEffect(() => {
        if (!isEnabled) return;
        const timer = window.setInterval(() => setTicks(getCurrentMs() * TICKS_PER_SECOND / 1000), 500);
        return () => window.clearInterval(timer);
    }, [ isEnabled ]);
    return ticks;
};

/** The episode playing and every episode after it in the series (across seasons). */
export const useEpisodesFrom = (episode?: ItemDto) => {
    const { api, user } = useApi();
    const seriesId = episode?.Type === 'Episode' ? episode.SeriesId : undefined;
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'EpisodesFrom', episode?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getEpisodes({
                seriesId: seriesId!,
                userId: user?.Id,
                startItemId: episode?.Id ?? undefined,
                isMissing: false,
                fields: [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ],
                imageTypeLimit: 1,
                enableUserData: true,
                limit: 60
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!seriesId && !!episode?.Id
    });
};
