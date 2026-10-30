import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { type AchievementFacts, getHistoryFacts } from './achievements';

/** Upper bound on watched titles read to add up hours and genres. */
const MAX_WATCHED = 2000;
const TOP_GENRES = 6;
const TICKS_PER_HOUR = 36_000_000_000;

export interface GenreShare {
    name: string;
    count: number;
}

export interface CinemaStats {
    hours: number;
    movies: number;
    episodes: number;
    favorites: number;
    genres: GenreShare[];
    mostWatched: ItemDto[];
    /** Sum of every watched title's runtime times its play count. */
    totalTicks: number;
    /** What the achievements are measured on. */
    facts: AchievementFacts;
}

/** Watched time counts every play, not just the first. */
const getWatchedTicks = (item: ItemDto) => (item.RunTimeTicks ?? 0) * Math.max(1, item.UserData?.PlayCount ?? 1);

const countGenres = (items: ItemDto[]) => {
    const counts = new Map<string, number>();
    for (const item of items) {
        for (const genre of item.Genres ?? []) counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
    return [ ...counts.entries() ]
        .map(([ name, count ]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_GENRES);
};

/** Everything the "Your Cinema" page shows, worked out from the user's watch history. */
export const useCinemaStats = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Stats', 2 ],
        queryFn: async ({ signal }): Promise<CinemaStats> => {
            const library = getLibraryApi(api!);
            const [ watched, favorites, mostWatched ] = await Promise.all([
                library.getItems({
                    userId: user?.Id,
                    recursive: true,
                    includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Episode, BaseItemKind.Video ],
                    filters: [ ItemFilter.IsPlayed ],
                    fields: [ ItemFields.Genres ],
                    enableUserData: true,
                    enableImages: false,
                    limit: MAX_WATCHED
                }, { signal }),
                library.getItems({
                    userId: user?.Id,
                    recursive: true,
                    filters: [ ItemFilter.IsFavorite ],
                    limit: 0,
                    enableTotalRecordCount: true
                }, { signal }),
                library.getItems({
                    userId: user?.Id,
                    recursive: true,
                    includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                    sortBy: [ ItemSortBy.PlayCount, ItemSortBy.DatePlayed ],
                    sortOrder: [ SortOrder.Descending ],
                    filters: [ ItemFilter.IsPlayed ],
                    fields: [ ItemFields.PrimaryImageAspectRatio ],
                    enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb ],
                    imageTypeLimit: 1,
                    enableUserData: true,
                    limit: 12
                }, { signal })
            ]);

            const items = (watched.data.Items ?? []) as ItemDto[];
            const totalTicks = items.reduce((sum, item) => sum + getWatchedTicks(item), 0);
            const hours = totalTicks / TICKS_PER_HOUR;
            const movies = items.filter(item => item.Type !== 'Episode').length;
            const episodes = items.length - movies;
            const favoriteCount = favorites.data.TotalRecordCount ?? 0;
            return {
                hours,
                movies,
                episodes,
                favorites: favoriteCount,
                facts: { movies, episodes, hours, favorites: favoriteCount, ...getHistoryFacts(items) },
                genres: countGenres(items),
                mostWatched: (mostWatched.data.Items ?? []) as ItemDto[],
                totalTicks
            };
        },
        enabled: !!api && !!user?.Id
    });
};
