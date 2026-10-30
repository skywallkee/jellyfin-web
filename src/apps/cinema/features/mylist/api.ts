import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { usePref, useSetPref } from '../prefs/api';

/** A title on My List, and when it was added (for "recently added" order). */
interface ListEntry {
    id: string;
    added: number;
}

const EMPTY: ListEntry[] = [];
/** Generous, but keeps the saved list (and the request for its items) a sensible size. */
const MAX_ENTRIES = 300;

/** The user's watchlist: what's on it, and adding or removing titles. Saved on the server. */
export const useMyList = () => {
    const entries = usePref<ListEntry[]>('myList', EMPTY);
    const setPref = useSetPref();
    const ids = useMemo(() => new Set(entries.map(entry => entry.id)), [ entries ]);

    const add = useCallback((item: ItemDto) => {
        if (!item.Id || ids.has(item.Id)) return;
        setPref('myList', [ { id: item.Id, added: Date.now() }, ...entries ].slice(0, MAX_ENTRIES));
    }, [ entries, ids, setPref ]);

    const remove = useCallback((item: ItemDto) => {
        setPref('myList', entries.filter(entry => entry.id !== item.Id));
    }, [ entries, setPref ]);

    const has = useCallback((item: ItemDto) => Boolean(item.Id && ids.has(item.Id)), [ ids ]);

    return { entries, has, add, remove };
};

/** The titles on My List, most recently added first. */
export const useMyListItems = () => {
    const { api, user } = useApi();
    const { entries } = useMyList();
    const idList = entries.map(entry => entry.id);

    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'MyListItems', idList ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                ids: idList,
                fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            // The server returns them in its own order; put them back in the list's order
            const byId = new Map(((response.data.Items ?? []) as ItemDto[]).map(item => [ item.Id, item ]));
            return idList.map(id => byId.get(id)).filter((item): item is ItemDto => Boolean(item));
        },
        enabled: !!api && !!user?.Id && idList.length > 0,
        placeholderData: previous => previous
    });
};
