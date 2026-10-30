import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { usePref, useSetPref } from '../prefs/api';

import { type DiaryEntry, sortEntries } from './diary';

const EMPTY: DiaryEntry[] = [];
/** Keeps the saved diary a sensible size; the oldest entries drop off past this. */
const MAX_ENTRIES = 1000;

/** The user's watch diary, saved on the server: entries, and adding, changing or removing them. */
export const useDiary = () => {
    const entries = usePref<DiaryEntry[]>('diary', EMPTY);
    const setPref = useSetPref();

    const save = useCallback((entry: DiaryEntry) => {
        const others = entries.filter(other => other.id !== entry.id);
        setPref('diary', sortEntries([ entry, ...others ]).slice(0, MAX_ENTRIES));
    }, [ entries, setPref ]);

    const remove = useCallback((id: string) => {
        setPref('diary', entries.filter(entry => entry.id !== id));
    }, [ entries, setPref ]);

    return { entries, save, remove };
};

/** A title's diary entries, newest first. */
export const useItemDiary = (itemId?: string | null) => {
    const { entries } = useDiary();
    return useMemo(() => sortEntries(entries.filter(entry => entry.itemId === itemId)), [ entries, itemId ]);
};

/** The titles the diary mentions, by id, for their artwork. */
export const useDiaryItems = (entries: DiaryEntry[]) => {
    const { api, user } = useApi();
    const ids = useMemo(() => [ ...new Set(entries.map(entry => entry.itemId)) ].sort((a, b) => a.localeCompare(b)), [ entries ]);

    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'DiaryItems', ids ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                ids,
                fields: [ ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Thumb, ImageType.Backdrop ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            return new Map(((response.data.Items ?? []) as ItemDto[]).map(item => [ item.Id ?? '', item ]));
        },
        enabled: !!api && !!user?.Id && ids.length > 0,
        placeholderData: previous => previous
    });
};
