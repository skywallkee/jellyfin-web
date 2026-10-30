import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

/** The YouTube video id in a trailer link (watch?v=…, youtu.be/…, /embed/…, /shorts/…). */
export const getYouTubeId = (url?: string | null) => {
    if (!url) return undefined;
    const match = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
    return match?.[1];
};

/** The first YouTube trailer linked to an item, if any. */
export const getYouTubeTrailerId = (item?: ItemDto | null) => {
    for (const trailer of item?.RemoteTrailers ?? []) {
        const id = getYouTubeId(trailer.Url);
        if (id) return id;
    }
    return undefined;
};

export type ClipSource =
    | { kind: 'youtube'; videoId: string }
    | { kind: 'video'; item: ItemDto; isTrailer: boolean };

/** A trailer file in the library for the item, if it has one. */
const useLocalTrailer = (item: ItemDto, isEnabled: boolean) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'LocalTrailer', item.Id ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getLocalTrailers({ itemId: item.Id!, userId: user?.Id }, { signal });
            return ((response.data ?? []) as ItemDto[])[0] ?? null;
        },
        enabled: isEnabled && !!api && !!user?.Id && !!item.Id && Boolean(item.LocalTrailerCount),
        staleTime: 60 * 60_000
    });
};

/**
 * What to play behind a title: its real trailer when there is one (a trailer file in the library,
 * or a YouTube trailer link), otherwise a clip from the title itself.
 */
export const useClipSource = (item: ItemDto, isEnabled: boolean): ClipSource | undefined => {
    const { data: localTrailer } = useLocalTrailer(item, isEnabled);
    if (localTrailer?.Id) return { kind: 'video', item: localTrailer, isTrailer: true };
    const youTubeId = getYouTubeTrailerId(item);
    if (youTubeId) return { kind: 'youtube', videoId: youTubeId };
    if (item.Id && item.MediaType === 'Video') return { kind: 'video', item, isTrailer: false };
    return undefined;
};

/** Whether anything can play behind a title (a trailer, or the title's own video). */
export const hasClipSource = (item?: ItemDto | null) => Boolean(
    item && (item.MediaType === 'Video' || item.LocalTrailerCount || getYouTubeTrailerId(item))
);
