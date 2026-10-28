import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { getShowApi } from '@jellyfin/sdk/lib/utils/api/show-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ];

export const useSeasons = (seriesId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Seasons', seriesId ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getSeasons({
                seriesId: seriesId!,
                userId: user?.Id,
                enableUserData: true,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!seriesId
    });
};

export const useEpisodes = (seriesId?: string | null, seasonId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Episodes', seriesId, seasonId ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getEpisodes({
                seriesId: seriesId!,
                seasonId: seasonId!,
                userId: user?.Id,
                fields: [ ItemFields.Overview, ItemFields.PrimaryImageAspectRatio ],
                enableUserData: true,
                enableImageTypes: IMAGE_TYPES,
                imageTypeLimit: 1
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!seriesId && !!seasonId
    });
};

export const useSimilarItems = (itemId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Similar', itemId ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getSimilarItems({
                itemId: itemId!,
                userId: user?.Id,
                limit: 16,
                fields: [ ItemFields.PrimaryImageAspectRatio ]
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && !!itemId
    });
};

/** The episode to continue with for a series: in progress, or the next unwatched one. */
export const useSeriesNextUp = (seriesId?: string | null) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'SeriesNextUp', seriesId ],
        queryFn: async ({ signal }) => {
            const response = await getShowApi(api!).getNextUp({
                seriesId: seriesId!,
                userId: user?.Id,
                limit: 1,
                enableResumable: true,
                enableUserData: true,
                fields: [ ItemFields.Overview ]
            }, { signal });
            return (response.data.Items?.[0] ?? null) as ItemDto | null;
        },
        enabled: !!api && !!user?.Id && !!seriesId
    });
};
