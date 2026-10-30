import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { withoutDisliked } from '../../utils/taste';
import { usePref, useSetPref } from '../prefs/api';

export type SmartKind = 'all' | 'movies' | 'shows';
export type SmartSort = 'random' | 'rating' | 'newest' | 'added';

/** A home row defined by rules rather than picked by hand. */
export interface SmartRow {
    id: string;
    /** Optional; a name is made from the rules when left empty. */
    name?: string;
    kind: SmartKind;
    genres: string[];
    /** Start year of a decade (e.g. 1990), or none for any time. */
    decade?: number;
    minRating?: number;
    maxMinutes?: number;
    unwatchedOnly: boolean;
    sort: SmartSort;
}

export const NEW_SMART_ROW: Omit<SmartRow, 'id'> = { kind: 'all', genres: [], unwatchedOnly: true, sort: 'random' };

const KIND_TYPES: Record<SmartKind, BaseItemKind[]> = {
    all: [ BaseItemKind.Movie, BaseItemKind.Series ],
    movies: [ BaseItemKind.Movie ],
    shows: [ BaseItemKind.Series ]
};

const SORTS: Record<SmartSort, { sortBy: ItemSortBy[]; sortOrder: SortOrder }> = {
    random: { sortBy: [ ItemSortBy.Random ], sortOrder: SortOrder.Ascending },
    rating: { sortBy: [ ItemSortBy.CommunityRating, ItemSortBy.SortName ], sortOrder: SortOrder.Descending },
    newest: { sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear ], sortOrder: SortOrder.Descending },
    added: { sortBy: [ ItemSortBy.DateCreated ], sortOrder: SortOrder.Descending }
};

const KIND_LABELS: Record<SmartKind, string> = { all: 'CinemaTitles', movies: 'Movies', shows: 'Shows' };

const ROW_SIZE = 20;
const TICKS_PER_MINUTE = 600_000_000;
const EMPTY: SmartRow[] = [];

/** A readable name from the rules, e.g. "Unwatched Drama from the 1990s". */
export const describeSmartRow = (row: Omit<SmartRow, 'id'>) => {
    if (row.name?.trim()) return row.name.trim();
    const kind = globalize.translate(KIND_LABELS[row.kind]);
    const parts = [
        row.unwatchedOnly ? globalize.translate('CinemaUnwatched') : undefined,
        row.genres.length ? row.genres.join(' & ') : undefined,
        kind.toLowerCase(),
        row.decade ? globalize.translate('CinemaFromDecade', `${row.decade}s`) : undefined,
        row.minRating ? globalize.translate('CinemaRatedAtLeast', row.minRating) : undefined,
        row.maxMinutes ? globalize.translate('CinemaUnderMinutes', row.maxMinutes) : undefined
    ].filter(Boolean).join(' ');
    return parts.charAt(0).toUpperCase() + parts.slice(1);
};

/** The user's smart rows, saved on the server, with saving. */
export const useSmartRows = () => {
    const rows = usePref<SmartRow[]>('smartRows', EMPTY);
    const setPref = useSetPref();
    const save = useCallback((next: SmartRow[]) => setPref('smartRows', next), [ setPref ]);
    return { rows, save };
};

const getYears = (decade?: number) => (decade ? Array.from({ length: 10 }, (_, i) => decade + i) : undefined);

/** The titles matching a smart row's rules (also used for the live preview while editing). */
export const useSmartRowItems = (row: Omit<SmartRow, 'id'>, isEnabled = true) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'SmartRow', row ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: KIND_TYPES[row.kind],
                genres: row.genres.length ? row.genres : undefined,
                years: getYears(row.decade),
                minCommunityRating: row.minRating,
                isPlayed: row.unwatchedOnly ? false : undefined,
                sortBy: SORTS[row.sort].sortBy,
                sortOrder: [ SORTS[row.sort].sortOrder ],
                // Extra, since runtime can only be filtered here
                limit: row.maxMinutes ? ROW_SIZE * 3 : ROW_SIZE,
                fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            const items = withoutDisliked((response.data.Items ?? []) as ItemDto[]);
            const maxTicks = row.maxMinutes ? row.maxMinutes * TICKS_PER_MINUTE : undefined;
            return (maxTicks ? items.filter(item => item.RunTimeTicks && item.RunTimeTicks <= maxTicks) : items).slice(0, ROW_SIZE);
        },
        enabled: isEnabled && !!api && !!user?.Id,
        // Random rows keep their picks while browsing; a new visit reshuffles
        staleTime: 10 * 60_000,
        placeholderData: previous => previous
    });
};

/** Every genre of movies and shows, to choose from. */
export const useAllTitleGenres = () => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'TitleGenres' ],
        queryFn: async ({ signal }) => {
            const response = await getGenreApi(api!).getGenres({
                userId: user?.Id,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                sortBy: [ ItemSortBy.SortName ],
                enableImages: false
            }, { signal });
            return ((response.data.Items ?? []) as ItemDto[]).map(genre => genre.Name ?? '').filter(Boolean);
        },
        enabled: !!api && !!user?.Id,
        staleTime: 30 * 60_000
    });
};
