import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/** How far back the history reaches. */
const HISTORY_LIMIT = 400;

/**
 * Everything the user has watched or started, most recent first. Jellyfin keeps the last time
 * each title was played (not every viewing), so each title appears once, at its latest watch.
 */
export const useWatchHistory = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'History' ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Episode, BaseItemKind.Video, BaseItemKind.MusicVideo ],
                sortBy: [ ItemSortBy.DatePlayed ],
                sortOrder: [ SortOrder.Descending ],
                fields: [ ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ],
                imageTypeLimit: 1,
                enableUserData: true,
                limit: HISTORY_LIMIT
            }, { signal });
            // Titles never played sort after the played ones; stop there
            const items = (response.data.Items ?? []) as ItemDto[];
            const firstUnplayed = items.findIndex(item => !item.UserData?.LastPlayedDate);
            return firstUnplayed < 0 ? items : items.slice(0, firstUnplayed);
        },
        enabled: !!api && !!user?.Id
    });
};

/** Genres of series, for counting genres of watched episodes (which rarely carry their own). */
export const useSeriesGenres = (seriesIds: string[]) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'SeriesGenres', seriesIds ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                ids: seriesIds,
                fields: [ ItemFields.Genres ],
                enableImageTypes: [ ImageType.Backdrop, ImageType.Logo, ImageType.Primary ],
                imageTypeLimit: 1
            }, { signal });
            return new Map(((response.data.Items ?? []) as ItemDto[]).map(series => [ series.Id ?? '', series ]));
        },
        enabled: !!api && !!user?.Id && seriesIds.length > 0
    });
};
