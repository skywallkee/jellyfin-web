import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import { getItemQuery } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import { getDefaultLibraryQuery, getLibraryItemsQuery } from '../features/library/api';

/** Libraries Cinema draws itself, and the item types each one lists. */
const LIBRARY_ITEM_TYPES: Partial<Record<string, BaseItemKind[]>> = {
    [CollectionType.Movies]: [ BaseItemKind.Movie ],
    [CollectionType.Tvshows]: [ BaseItemKind.Series ]
};

/** A short wait, so sweeping the pointer across a row doesn't fire a request per card. */
const HOVER_INTENT_MS = 180;
let hoverTimer = 0;

/**
 * Starts loading what the user is about to open — a title's details when its card is hovered,
 * a library's first page when its tab is hovered — so it appears instantly on click.
 * Anything already loaded and fresh is not fetched again.
 */
export const usePrefetch = () => {
    const queryClient = useQueryClient();
    const { api, user } = useApi();
    const userId = user?.Id;

    return useMemo(() => ({
        /** Call when the pointer or focus arrives on a card. */
        prefetchItem: (item: ItemDto) => {
            window.clearTimeout(hoverTimer);
            if (!api || !userId || !item.Id) return;
            const itemId = item.Id;
            hoverTimer = window.setTimeout(() => {
                void queryClient.prefetchQuery(getItemQuery(api, itemId, userId));
            }, HOVER_INTENT_MS);
        },
        /** Call when the pointer or focus leaves the card before the wait is over. */
        cancelPrefetch: () => window.clearTimeout(hoverTimer),
        /** Call when the pointer or focus arrives on a library's tab. */
        prefetchLibrary: (view: ItemDto) => {
            const itemTypes = LIBRARY_ITEM_TYPES[view.CollectionType ?? ''];
            if (!api || !userId || !view.Id || !itemTypes) return;
            void queryClient.prefetchInfiniteQuery(getLibraryItemsQuery(api, userId, getDefaultLibraryQuery(view.Id, itemTypes)));
        }
    }), [ api, queryClient, userId ]);
};
