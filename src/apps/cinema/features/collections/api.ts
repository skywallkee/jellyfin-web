import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ];

/** Everything in a collection, in release order (the order a saga is meant to be watched in). */
export const useCollectionItems = (collectionId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Collection', collectionId ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                parentId: collectionId!,
                sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Ascending ],
                fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true,
                limit: 200
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!collectionId
    });
};

/** Watched so far, out of how many. */
export const getCollectionProgress = (items: ItemDto[]) => ({
    watched: items.filter(item => item.UserData?.Played).length,
    total: items.length
});

/** What to play: the first unwatched title, in order. */
export const getNextInCollection = (items: ItemDto[]) => items.find(item => !item.UserData?.Played);

/** Collections the user has started but not finished, most recently watched first. */
export const useCollectionsInProgress = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'CollectionsInProgress' ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.BoxSet ],
                sortBy: [ ItemSortBy.DatePlayed, ItemSortBy.SortName ],
                sortOrder: [ SortOrder.Descending ],
                fields: [ ItemFields.ChildCount, ItemFields.PrimaryImageAspectRatio, ItemFields.Overview ],
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1,
                enableUserData: true,
                limit: 100
            }, { signal });
            return ((response.data.Items ?? []) as ItemDto[]).filter(collection => {
                const unwatched = collection.UserData?.UnplayedItemCount ?? 0;
                return unwatched > 0 && unwatched < (collection.ChildCount ?? 0);
            });
        },
        enabled: !!api && !!user?.Id
    });
};
