import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import React, { type FC, useMemo } from 'react';

import { useLatestMedia } from 'apps/legacy/features/libraries/api/useLatestMedia';
import { useNextUp } from 'apps/legacy/features/libraries/api/useNextUp';
import { useResumeItems } from 'apps/legacy/features/libraries/api/useResumeItems';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import HeroBanner from '../components/HeroBanner';
import type { CardShape } from '../components/MediaCard';
import MediaRow from '../components/MediaRow';
import { hasBackdrop, isMostlyWide } from '../utils/images';
import { formatRuntime, getRemainingTicks } from '../utils/items';

const ROW_LIMIT = 16;
const HERO_LIMIT = 5;
const FIELDS = [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio ];
const IMAGE_TYPES = [ ImageType.Primary, ImageType.Backdrop, ImageType.Thumb, ImageType.Logo ];

/** Libraries that get a "Recently added" row, and the card shape each uses. */
const LATEST_ROW_SHAPES: Partial<Record<string, CardShape>> = {
    [CollectionType.Movies]: 'poster',
    [CollectionType.Tvshows]: 'poster',
    [CollectionType.Music]: 'square',
    [CollectionType.Books]: 'poster',
    [CollectionType.Homevideos]: 'landscape',
    [CollectionType.Musicvideos]: 'landscape'
};

const getResumeSubtitle = (item: ItemDto) => {
    const remaining = formatRuntime(getRemainingTicks(item));
    const episodeName = item.Type === 'Episode' ? item.Name : undefined;
    return [ episodeName, remaining ].filter(Boolean).join(' · ') || undefined;
};

const getEpisodeName = (item: ItemDto) => item.Name ?? undefined;

const getYear = (item: ItemDto) => item.ProductionYear?.toString();

const LatestRow: FC<{ library: ItemDto }> = ({ library }) => {
    const { data, isPending } = useLatestMedia({
        parentId: library.Id ?? undefined,
        limit: ROW_LIMIT,
        fields: FIELDS,
        enableImageTypes: IMAGE_TYPES,
        imageTypeLimit: 1
    });

    const items = data as ItemDto[] | undefined;
    const shape = isMostlyWide(items) ? 'landscape' : LATEST_ROW_SHAPES[library.CollectionType ?? ''] ?? 'poster';

    return (
        <MediaRow
            title={globalize.translate('LatestFromLibrary', library.Name ?? '')}
            items={items}
            isPending={isPending}
            shape={shape}
            getSubtitle={getYear}
        />
    );
};

const Home: FC = () => {
    const { user } = useApi();
    const commonParams = {
        fields: FIELDS,
        enableImageTypes: IMAGE_TYPES,
        imageTypeLimit: 1,
        enableUserData: true
    };

    const resume = useResumeItems({
        ...commonParams,
        limit: ROW_LIMIT,
        mediaTypes: [ MediaType.Video ]
    });
    const nextUp = useNextUp({
        ...commonParams,
        limit: ROW_LIMIT,
        enableResumable: false
    });
    const { data: userViews } = useUserViews({ userId: user?.Id });
    // Used for the hero when nothing is in progress yet
    const latestAll = useLatestMedia({
        ...commonParams,
        limit: ROW_LIMIT,
        includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ]
    });

    const libraries = useMemo(() => (
        (userViews?.Items ?? []).filter(view => view.CollectionType && LATEST_ROW_SHAPES[view.CollectionType])
    ), [ userViews ]);

    const resumeItems = resume.data?.Items as ItemDto[] | undefined;
    const nextUpItems = nextUp.data?.Items as ItemDto[] | undefined;

    // Feature what the user is in the middle of, then what's next, as long as there's artwork for it
    const heroItems = useMemo(() => {
        const seen = new Set<string>();
        return [ ...(resumeItems ?? []), ...(nextUpItems ?? []), ...((latestAll.data as ItemDto[] | undefined) ?? []) ]
            .filter(item => {
                const key = item.SeriesId ?? item.Id ?? '';
                if (!hasBackdrop(item) || seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, HERO_LIMIT);
    }, [ resumeItems, nextUpItems, latestAll.data ]);

    return (
        <div className='cinema-home'>
            {heroItems.length > 0 ?
                <HeroBanner items={heroItems} /> :
                <div style={{ height: 'var(--cinema-nav-offset)' }} />}

            <div className='cinema-rows'>
                <MediaRow
                    title={globalize.translate('HeaderContinueWatching')}
                    items={resumeItems}
                    isPending={resume.isPending}
                    shape='landscape'
                    showProgress
                    getSubtitle={getResumeSubtitle}
                />
                <MediaRow
                    title={globalize.translate('NextUp')}
                    items={nextUpItems}
                    isPending={nextUp.isPending}
                    shape='landscape'
                    getSubtitle={getEpisodeName}
                />
                {libraries.map(library => (
                    <LatestRow key={library.Id} library={library} />
                ))}
            </div>
        </div>
    );
};

export default Home;
