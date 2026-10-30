import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

/** Episodes airing soon for shows in the user's libraries, soonest first. */
export const useUpcomingEpisodes = (limit = 60) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Upcoming', limit ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getUpcomingEpisodes({
                userId: user?.Id,
                limit,
                fields: [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id,
        staleTime: 30 * 60_000
    });
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Tomorrow", "Friday" (within a week) or "Nov 14". */
export const getAirLabel = (date?: string | null) => {
    if (!date) return globalize.translate('CinemaDateUnknown');
    const air = new Date(date);
    const today = new Date();
    const days = Math.round(
        (new Date(air.getFullYear(), air.getMonth(), air.getDate()).getTime()
        - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / DAY_MS
    );
    if (days <= 0) return globalize.translate('CinemaToday');
    if (days === 1) return globalize.translate('CinemaTomorrow');
    if (days < 7) return air.toLocaleDateString(undefined, { weekday: 'long' });
    return air.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** True for an episode the library knows about but doesn't have a file for (yet). */
export const isMissingEpisode = (episode: ItemDto) => episode.LocationType === 'Virtual';

/** Whether a missing episode hasn't aired yet (rather than being one the library just lacks). */
export const isUnaired = (episode: ItemDto) => Boolean(episode.PremiereDate && new Date(episode.PremiereDate) > new Date());
