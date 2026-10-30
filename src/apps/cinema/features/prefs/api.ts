import type { DisplayPreferencesDto } from '@jellyfin/sdk/lib/generated-client/models/display-preferences-dto';
import { getDisplayPreferenceApi } from '@jellyfin/sdk/lib/utils/api/display-preference-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApi } from 'hooks/useApi';

/** Where Cinema keeps per-user data on the server, so it follows the user to every device. */
const PREFS_ID = 'cinema';
const PREFS_CLIENT = 'cinema';

export type CinemaPrefKey = 'myList' | 'smartRows' | 'diary';

const useQueryKey = () => {
    const { user } = useApi();
    return [ 'User', user?.Id, 'Cinema', 'Prefs' ];
};

/** Cinema's saved data for this user (My List, smart rows…), read from the server. */
export const useCinemaPrefs = () => {
    const { api, user } = useApi();
    const queryKey = useQueryKey();
    return useQuery({
        queryKey,
        queryFn: async ({ signal }) => {
            const response = await getDisplayPreferenceApi(api!).getDisplayPreferences({
                displayPreferencesId: PREFS_ID,
                userId: user?.Id,
                client: PREFS_CLIENT
            }, { signal });
            return response.data;
        },
        enabled: !!api && !!user?.Id,
        staleTime: 5 * 60_000
    });
};

/** One saved value as parsed JSON, with a fallback while loading or when unset. */
export const usePref = <T>(key: CinemaPrefKey, fallback: T): T => {
    const { data } = useCinemaPrefs();
    const raw = data?.CustomPrefs?.[key];
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

/**
 * Saves one value. The screen updates at once; if saving fails, the previous value comes back.
 * Each save writes the latest full preferences, so changes made in a row don't overwrite each other.
 */
export const useSetPref = () => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const queryKey = useQueryKey();

    const { mutate } = useMutation({
        mutationFn: async (next: DisplayPreferencesDto) => {
            await getDisplayPreferenceApi(api!).updateDisplayPreferences({
                displayPreferencesId: PREFS_ID,
                userId: user?.Id,
                client: PREFS_CLIENT,
                displayPreferencesDto: next
            });
        }
    });

    return useCallback(<T>(key: CinemaPrefKey, value: T) => {
        const previous = queryClient.getQueryData<DisplayPreferencesDto>(queryKey);
        const next: DisplayPreferencesDto = {
            ...previous,
            Id: PREFS_ID,
            Client: PREFS_CLIENT,
            CustomPrefs: { ...previous?.CustomPrefs, [key]: JSON.stringify(value) }
        };
        queryClient.setQueryData(queryKey, next);
        mutate(next, { onError: () => queryClient.setQueryData(queryKey, previous) });
    }, [ mutate, queryClient, queryKey ]);
};
