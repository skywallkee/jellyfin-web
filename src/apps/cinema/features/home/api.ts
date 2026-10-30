import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const TITLE_TYPES = [ BaseItemKind.Movie, BaseItemKind.Series ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ];
const FIELDS = [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ];

/** The highest rated movies and shows across the user's libraries, for the Top 10 row. */
export const useTopRated = (limit = 10) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'TopRated', limit ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: TITLE_TYPES,
                sortBy: [ ItemSortBy.CommunityRating, ItemSortBy.CriticRating, ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Descending ],
                limit,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            // Unrated titles sort last; a "top 10" of unrated titles would be meaningless
            return ((response.data.Items ?? []) as ItemDto[]).filter(item => item.CommunityRating || item.CriticRating);
        },
        enabled: !!api && !!user?.Id
    });
};

/** Titles the user marked as favourites, most recently added first. */
export const useFavorites = (limit = 16) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Favorites', limit ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ ...TITLE_TYPES, BaseItemKind.Episode, BaseItemKind.Video ],
                filters: [ ItemFilter.IsFavorite ],
                sortBy: [ ItemSortBy.DateCreated ],
                sortOrder: [ SortOrder.Descending ],
                limit,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id
    });
};

export interface WatchedSeed {
    /** The movie or series to find similar titles for. */
    id: string;
    name: string;
    /** Seeded by a thumbs up rather than by watching. */
    isLiked?: boolean;
}

/** The titles the user most recently gave a thumbs up, to seed "Because you liked…" rows. */
export const useLikedSeeds = (count = 1) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'LikedSeeds', count ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                filters: [ ItemFilter.Likes ],
                sortBy: [ ItemSortBy.DatePlayed, ItemSortBy.DateCreated ],
                sortOrder: [ SortOrder.Descending ],
                limit: count,
                enableImages: false
            }, { signal });
            return ((response.data.Items ?? []) as ItemDto[])
                .filter(item => item.Id && item.Name)
                .map(item => ({ id: item.Id!, name: item.Name!, isLiked: true }));
        },
        enabled: !!api && !!user?.Id
    });
};

/**
 * The last few distinct titles the user watched (episodes count as their series),
 * used to seed "Because you watched…" rows.
 */
export const useRecentlyWatched = (count = 2) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'RecentlyWatched', count ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Episode ],
                sortBy: [ ItemSortBy.DatePlayed ],
                sortOrder: [ SortOrder.Descending ],
                limit: 20,
                enableUserData: true,
                enableImages: false
            }, { signal });
            const seeds: WatchedSeed[] = [];
            for (const item of (response.data.Items ?? []) as ItemDto[]) {
                // Titles never started sort after the played ones; stop there
                if (!item.UserData?.LastPlayedDate) break;
                const id = item.Type === 'Episode' ? item.SeriesId : item.Id;
                const name = item.Type === 'Episode' ? item.SeriesName : item.Name;
                if (id && name && !seeds.some(seed => seed.id === id)) seeds.push({ id, name });
                if (seeds.length === count) break;
            }
            return seeds;
        },
        enabled: !!api && !!user?.Id
    });
};
