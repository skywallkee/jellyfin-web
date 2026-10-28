import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ];
const FIELDS = [ ItemFields.PrimaryImageAspectRatio, ItemFields.Genres, ItemFields.Overview ];
const TITLE_TYPES = [ BaseItemKind.Movie, BaseItemKind.Series ];

/** Everything in the library a person appears in, newest first. */
export const usePersonCredits = (personId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'PersonCredits', personId ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                personIds: [ personId! ],
                recursive: true,
                includeItemTypes: [ ...TITLE_TYPES, BaseItemKind.Episode, BaseItemKind.Video ],
                sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Descending ],
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true,
                limit: 200
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!personId
    });
};

export type GenreSort = 'popular' | 'added' | 'name' | 'released';
export type GenreKind = 'all' | 'movies' | 'shows';

const GENRE_SORTS: Record<GenreSort, { sortBy: ItemSortBy[]; sortOrder: SortOrder }> = {
    popular: { sortBy: [ ItemSortBy.CommunityRating, ItemSortBy.PlayCount, ItemSortBy.SortName ], sortOrder: SortOrder.Descending },
    added: { sortBy: [ ItemSortBy.DateCreated, ItemSortBy.SortName ], sortOrder: SortOrder.Descending },
    name: { sortBy: [ ItemSortBy.SortName ], sortOrder: SortOrder.Ascending },
    released: { sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear ], sortOrder: SortOrder.Descending }
};

const GENRE_KINDS: Record<GenreKind, BaseItemKind[]> = {
    all: TITLE_TYPES,
    movies: [ BaseItemKind.Movie ],
    shows: [ BaseItemKind.Series ]
};

export const GENRE_PAGE_SIZE = 48;

/** Titles in a genre, a page at a time as the user scrolls. */
export const useGenreItems = (genreId: string | undefined, sort: GenreSort, kind: GenreKind) => {
    const { api, user } = useApi();
    return useInfiniteQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Genre', genreId, sort, kind ],
        queryFn: async ({ pageParam, signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                genreIds: [ genreId! ],
                recursive: true,
                includeItemTypes: GENRE_KINDS[kind],
                sortBy: GENRE_SORTS[sort].sortBy,
                sortOrder: [ GENRE_SORTS[sort].sortOrder ],
                startIndex: pageParam,
                limit: GENRE_PAGE_SIZE,
                fields: FIELDS,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true,
                enableTotalRecordCount: true
            }, { signal });
            return {
                items: (response.data.Items ?? []) as ItemDto[],
                total: response.data.TotalRecordCount ?? 0,
                startIndex: pageParam
            };
        },
        initialPageParam: 0,
        getNextPageParam: lastPage => {
            const next = lastPage.startIndex + GENRE_PAGE_SIZE;
            return next < lastPage.total ? next : undefined;
        },
        enabled: !!api && !!user?.Id && !!genreId
    });
};

/** The item's theme song (or its series'), if the library has one. */
export const useThemeSong = (itemId?: string | null, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'ThemeSong', itemId ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getThemeSongs({
                itemId: itemId!,
                userId: user?.Id,
                inheritFromParent: true
            }, { signal });
            return ((response.data.Items ?? [])[0] ?? null) as ItemDto | null;
        },
        enabled: isEnabled && !!api && !!user?.Id && !!itemId,
        staleTime: 60 * 60_000
    });
};
