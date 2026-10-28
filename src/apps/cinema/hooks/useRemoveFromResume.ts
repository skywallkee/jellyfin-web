import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { refreshUserData } from '../utils/refresh';

/**
 * Takes a title out of Continue Watching by clearing its saved position (it stays unwatched).
 * Rows refresh afterwards so it disappears everywhere.
 */
export const useRemoveFromResume = () => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();

    return useCallback(async (item: ItemDto) => {
        if (!api || !user?.Id || !item.Id) return;
        await getUserDataApi(api).updateItemUserData({
            itemId: item.Id,
            userId: user.Id,
            updateUserItemDataDto: { PlaybackPositionTicks: 0 }
        });
        await refreshUserData(queryClient);
    }, [ api, queryClient, user?.Id ]);
};
