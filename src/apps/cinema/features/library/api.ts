import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

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
}

const FILTERS: Record<LibraryFilter, ItemFilter[] | undefined> = {
    all: undefined,
    unplayed: [ ItemFilter.IsUnplayed ],
    favorites: [ ItemFilter.IsFavorite ]
};

export const useLibraryItems = (query: LibraryQuery) => {
    const { api, user } = useApi();
    return useInfiniteQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Library', query ],
        queryFn: async ({ pageParam, signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                parentId: query.parentId,
                recursive: true,
                includeItemTypes: query.itemTypes,
                sortBy: query.sortBy,
                sortOrder: [ query.sortOrder ],
                filters: FILTERS[query.filter],
                genreIds: query.genreId ? [ query.genreId ] : undefined,
                startIndex: pageParam,
                limit: PAGE_SIZE,
                fields: [ ItemFields.PrimaryImageAspectRatio ],
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
        enabled: !!api && !!user?.Id && !!query.parentId
    });
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
