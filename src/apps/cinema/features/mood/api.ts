import type { Api } from '@jellyfin/sdk/lib/api';
import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { withoutDisliked } from '../../utils/taste';

export type MoodKey = 'cozy' | 'thrilling' | 'funny' | 'mindbending' | 'epic' | 'heartfelt' | 'spooky' | 'any';
export type TimeKey = 'quick' | 'hour' | 'movie' | 'binge';

/** Each mood and the genres that fit it (any one is enough). */
export const MOOD_GENRES: Record<MoodKey, string[]> = {
    cozy: [ 'Comedy', 'Family', 'Animation', 'Romance' ],
    thrilling: [ 'Thriller', 'Action', 'Crime', 'Adventure' ],
    funny: [ 'Comedy', 'Animation' ],
    mindbending: [ 'Science Fiction', 'Sci-Fi', 'Mystery', 'Fantasy' ],
    epic: [ 'Adventure', 'Fantasy', 'War', 'History', 'Action' ],
    heartfelt: [ 'Drama', 'Romance', 'Music' ],
    spooky: [ 'Horror', 'Mystery', 'Thriller' ],
    any: []
};

/** How much time there is: what can be watched in it, and how long that may run. */
export const TIMES: Record<TimeKey, { types: BaseItemKind[]; maxMinutes?: number }> = {
    // A short film or one episode
    quick: { types: [ BaseItemKind.Movie, BaseItemKind.Series ], maxMinutes: 30 },
    hour: { types: [ BaseItemKind.Movie, BaseItemKind.Series ], maxMinutes: 65 },
    movie: { types: [ BaseItemKind.Movie ], maxMinutes: 150 },
    // A show to get lost in
    binge: { types: [ BaseItemKind.Series ] }
};

const PICKS = 3;
const POOL = 80;
const TICKS_PER_MINUTE = 600_000_000;

/** Fits the time available. A show's runtime is the length of an episode. */
export const fitsTime = (item: ItemDto, time: TimeKey) => {
    const { maxMinutes } = TIMES[time];
    if (!maxMinutes) return true;
    return Boolean(item.RunTimeTicks) && (item.RunTimeTicks ?? 0) <= maxMinutes * TICKS_PER_MINUTE;
};

const fetchPool = async (api: Api, userId: string, time: TimeKey, genres: string[], signal?: AbortSignal) => {
    const response = await getLibraryApi(api).getItems({
        userId,
        recursive: true,
        includeItemTypes: TIMES[time].types,
        genres: genres.length ? genres : undefined,
        isPlayed: false,
        sortBy: [ ItemSortBy.Random ],
        limit: POOL,
        fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio, ItemFields.RemoteTrailers ],
        enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ],
        imageTypeLimit: 1,
        enableUserData: true
    }, { signal });
    return withoutDisliked((response.data.Items ?? []) as ItemDto[]).filter(item => fitsTime(item, time));
};

export interface MoodPicks {
    items: ItemDto[];
    /** Nothing fit the mood exactly, so these only fit the time. */
    isRelaxed: boolean;
}

/** Three unwatched titles that fit the mood and the time; `round` asks for a fresh set. */
export const useMoodPicks = (mood: MoodKey | undefined, time: TimeKey, round: number) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Mood', mood, time, round ],
        queryFn: async ({ signal }): Promise<MoodPicks> => {
            const genres = MOOD_GENRES[mood ?? 'any'];
            const exact = await fetchPool(api!, user!.Id!, time, genres, signal);
            if (exact.length >= PICKS || !genres.length) return { items: exact.slice(0, PICKS), isRelaxed: false };
            // Too few for this mood: fill up with anything that fits the time
            const extra = (await fetchPool(api!, user!.Id!, time, [], signal)).filter(item => !exact.some(found => found.Id === item.Id));
            return { items: [ ...exact, ...extra ].slice(0, PICKS), isRelaxed: exact.length === 0 };
        },
        enabled: !!api && !!user?.Id && !!mood,
        staleTime: Infinity,
        placeholderData: previous => previous
    });
};
