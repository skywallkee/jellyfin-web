import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import React, { type FC } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import MediaRow from '../../components/MediaRow';
import { isMostlyWide } from '../../utils/images';
import { useCinemaSettings } from '../../utils/settings';
import { withoutDisliked } from '../../utils/taste';

import { type SeasonalEvent, getActiveSeason } from './seasons';

/** Titles that suit the occasion, unwatched ones first, in a fresh order each visit. */
const useSeasonalItems = (season?: SeasonalEvent) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Seasonal', season?.key ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                genres: season!.genres,
                sortBy: [ ItemSortBy.IsPlayed, ItemSortBy.Random ],
                limit: 20,
                fields: [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ],
                imageTypeLimit: 1,
                enableUserData: true
            }, { signal });
            return withoutDisliked((response.data.Items ?? []) as ItemDto[]);
        },
        enabled: !!api && !!user?.Id && !!season,
        staleTime: 30 * 60_000
    });
};

const getYear = (item: ItemDto) => item.ProductionYear?.toString();

/** Drifting motes in the occasion's style (embers, snow, hearts, sun) behind the top of the page. */
const PARTICLES = Array.from({ length: 14 }, (_, i) => i);

export const SeasonalEffects: FC = () => {
    const [ settings ] = useCinemaSettings();
    const season = getActiveSeason();
    if (!settings.seasonal || !season) return null;
    return (
        <div className={`cinema-seasonfx cinema-seasonfx--${season.key}`} aria-hidden='true'>
            {PARTICLES.map(i => <span key={i} className='cinema-seasonfx__mote' />)}
        </div>
    );
};

/** A row for the occasion, e.g. Halloween picks through October, with its own look. */
const SeasonalRow: FC = () => {
    const [ settings ] = useCinemaSettings();
    const season = settings.seasonal ? getActiveSeason() : undefined;
    const { data, isPending } = useSeasonalItems(season);
    if (!season || (!isPending && !data?.length)) return null;

    return (
        <div className={`cinema-seasonal cinema-seasonal--${season.key}`}>
            <p className='cinema-seasonal__tagline'>{globalize.translate(`CinemaSeasonTagline_${season.key}`)}</p>
            <MediaRow
                title={globalize.translate(`CinemaSeason_${season.key}`)}
                items={data}
                isPending={isPending}
                shape={isMostlyWide(data) ? 'landscape' : 'poster'}
                getSubtitle={getYear}
            />
        </div>
    );
};

export default SeasonalRow;
