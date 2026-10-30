import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import type { Api } from '@jellyfin/sdk/lib/api';
import { infiniteQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { hasBackdrop } from '../../utils/images';

/** Items fetched per page while scrolling. */
export const PAGE_SIZE = 60;
const GENRE_LIMIT = 40;

export type LibraryFilter = 'all' | 'unplayed' | 'favorites';

export interface LibraryQuery {
    parentId: string;
    itemTypes: BaseItemKind[];
    sortBy: ItemSortBy[];
    sortOrder: SortOrder;
    filter: LibraryFilter;
    genreId?: string;
    /** Only titles starting with this letter ("#" for anything else). */
    letter?: string;
}

const FILTERS: Record<LibraryFilter, ItemFilter[] | undefined> = {
    all: undefined,
    unplayed: [ ItemFilter.IsUnplayed ],
    favorites: [ ItemFilter.IsFavorite ]
};

/** The library's default view: newest first, no filters. Used to prefetch a library before it opens. */
export const DEFAULT_LIBRARY_SORT = {
    sortBy: [ ItemSortBy.DateCreated, ItemSortBy.SortName ],
    sortOrder: SortOrder.Descending
};

export const getDefaultLibraryQuery = (parentId: string, itemTypes: BaseItemKind[]): LibraryQuery => ({
    parentId,
    itemTypes,
    ...DEFAULT_LIBRARY_SORT,
    filter: 'all'
});

export const getLibraryItemsQuery = (api: Api | undefined, userId: string | undefined, query: LibraryQuery) => infiniteQueryOptions({
    queryKey: [ 'User', userId, 'Cinema', 'Library', query ],
    queryFn: async ({ pageParam, signal }) => {
        const response = await getLibraryApi(api!).getItems({
            userId,
            parentId: query.parentId,
            recursive: true,
            includeItemTypes: query.itemTypes,
            sortBy: query.sortBy,
            sortOrder: [ query.sortOrder ],
            filters: FILTERS[query.filter],
            genreIds: query.genreId ? [ query.genreId ] : undefined,
            // "#" means titles that don't start with a letter, i.e. sort before "A"
            nameStartsWith: query.letter && query.letter !== '#' ? query.letter : undefined,
            nameLessThan: query.letter === '#' ? 'A' : undefined,
            startIndex: pageParam,
            limit: PAGE_SIZE,
            fields: [ ItemFields.PrimaryImageAspectRatio, ItemFields.DateCreated ],
            enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ],
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
        const next = lastPage.startIndex + PAGE_SIZE;
        return next < lastPage.total ? next : undefined;
    },
    enabled: !!api && !!userId && !!query.parentId
});

export const useLibraryItems = (query: LibraryQuery) => {
    const { api, user } = useApi();
    return useInfiniteQuery(getLibraryItemsQuery(api, user?.Id, query));
};

export const useLibraryGenres = (parentId: string, itemTypes: BaseItemKind[]) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Genres', parentId, itemTypes ],
        queryFn: async ({ signal }) => {
            const response = await getGenreApi(api!).getGenres({
                userId: user?.Id,
                parentId,
                includeItemTypes: itemTypes,
                sortBy: [ ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Ascending ],
                limit: GENRE_LIMIT,
                enableImages: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!parentId
    });
};

const SPOTLIGHT_COUNT = 5;

/** A few random titles from the library with artwork, for the spotlight at the top of the page. */
export const useLibrarySpotlight = (parentId: string, itemTypes: BaseItemKind[]) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Spotlight', parentId, itemTypes ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                parentId,
                recursive: true,
                includeItemTypes: itemTypes,
                sortBy: [ ItemSortBy.Random ],
                // Extra, since only titles with wide artwork are used
                limit: SPOTLIGHT_COUNT * 3,
                fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio, ItemFields.RemoteTrailers ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            return ((response.data.Items ?? []) as ItemDto[]).filter(hasBackdrop).slice(0, SPOTLIGHT_COUNT);
        },
        enabled: !!api && !!user?.Id && !!parentId,
        // Keep the same picks while browsing the library; a new visit reshuffles
        staleTime: 5 * 60_000
    });
};
