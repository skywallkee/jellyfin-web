import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { withoutDisliked } from '../../utils/taste';

const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ];
const FIELDS = [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ];
const SUGGESTION_COUNT = 10;

/** The episode that follows the one just watched, in the series' own order (across seasons). */
export const useFollowingEpisode = (episode?: ItemDto) => {
    const { api, user } = useApi();
    const seriesId = episode?.Type === 'Episode' ? episode.SeriesId : undefined;
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'FollowingEpisode', episode?.Id ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getEpisodes({
                seriesId: seriesId!,
                userId: user?.Id,
                // Starting from the finished episode, the second result is the one after it
                startItemId: episode?.Id ?? undefined,
                limit: 2,
                // Placeholders for episodes the library doesn't have can't be played
                isMissing: false,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            const next = (response.data.Items ?? [])[1] as ItemDto | undefined;
            return next && next.Id !== episode?.Id ? next : null;
        },
        enabled: !!api && !!user?.Id && !!seriesId && !!episode?.Id
    });
};

/**
 * Unwatched titles to suggest after something ends: the same genres first, otherwise anything
 * not yet watched, in random order. The finished title (and its series) are left out.
 */
export const useAlsoWatch = (finished?: ItemDto, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'AlsoWatch', finished?.Id ],
        queryFn: async ({ signal }) => {
            const library = getLibraryApi(api!);
            const exclude = [ finished?.Id, finished?.SeriesId ].filter((id): id is string => Boolean(id));

            // Episodes rarely carry genres themselves; their series does
            let genres = finished?.Genres ?? [];
            if (!genres.length && finished?.SeriesId) {
                const series = await library.getItem({ itemId: finished.SeriesId, userId: user?.Id }, { signal });
                genres = series.data.Genres ?? [];
            }

            const query = {
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                filters: [ ItemFilter.IsUnplayed ],
                excludeItemIds: exclude,
                sortBy: [ ItemSortBy.Random ],
                limit: SUGGESTION_COUNT,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true
            };

            if (genres.length) {
                const sameGenre = await library.getItems({ ...query, genres }, { signal });
                const items = withoutDisliked((sameGenre.data.Items ?? []) as ItemDto[]);
                if (items.length) return { items, isSameGenre: true };
            }

            const anything = await library.getItems(query, { signal });
            return { items: withoutDisliked((anything.data.Items ?? []) as ItemDto[]), isSameGenre: false };
        },
        enabled: isEnabled && !!api && !!user?.Id && !!finished?.Id,
        // A fresh pick each time something ends
        staleTime: 0
    });
};
