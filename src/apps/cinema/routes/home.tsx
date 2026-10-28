import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { MediaType } from '@jellyfin/sdk/lib/generated-client/models/media-type';
import React, { type FC, useMemo } from 'react';

import { useLatestMedia } from 'apps/legacy/features/libraries/api/useLatestMedia';
import { useNextUp } from 'apps/legacy/features/libraries/api/useNextUp';
import { useResumeItems } from 'apps/legacy/features/libraries/api/useResumeItems';
import { appRouter } from 'components/router/appRouter';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import HeroBanner from '../components/HeroBanner';
import LazySection from '../components/LazySection';
import { type WatchedSeed, useFavorites, useRecentlyWatched, useTopRated } from '../features/home/api';
import { useSimilarItems } from '../features/details/api';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import type { CardShape } from '../components/MediaCard';
import MediaRow from '../components/MediaRow';
import { hasBackdrop, isMostlyWide } from '../utils/images';
import { formatRuntime, getRemainingTicks } from '../utils/items';

const ROW_LIMIT = 16;
const HERO_LIMIT = 5;
const FIELDS = [ ItemFields.Overview, ItemFields.Genres, ItemFields.PrimaryImageAspectRatio, ItemFields.DateCreated ];
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

const getGreetingKey = (hour: number) => {
    if (hour < 5) return 'CinemaGreetingNight';
    if (hour < 12) return 'CinemaGreetingMorning';
    if (hour < 18) return 'CinemaGreetingAfternoon';
    return 'CinemaGreetingEvening';
};

/** "Good evening, Alex" over the rows, a small human touch. */
const Greeting: FC<{ name?: string | null }> = ({ name }) => (
    <p className='cinema-greeting'>
        {globalize.translate(getGreetingKey(new Date().getHours()), name ?? '')}
    </p>
);

/** "Because you watched X": titles similar to something the user watched recently. */
const BecauseRow: FC<{ seed: WatchedSeed }> = ({ seed }) => {
    const { data, isPending } = useSimilarItems(seed.id);
    return (
        <MediaRow
            title={globalize.translate('CinemaBecauseYouWatched', seed.name)}
            items={data}
            isPending={isPending}
            shape={isMostlyWide(data) ? 'landscape' : 'poster'}
            getSubtitle={getYear}
        />
    );
};

/** "Because you watched…" for the n-th most recently watched title, if there is one. */
const BecauseSlot: FC<{ index: number }> = ({ index }) => {
    const { data: seeds } = useRecentlyWatched();
    const seed = seeds?.[index];
    return seed ? <BecauseRow seed={seed} /> : null;
};

/** Top 10, only worth showing once there's a decent number of rated titles. */
const TopTenRow: FC = () => {
    const { data } = useTopRated();
    if ((data?.length ?? 0) < 5) return null;
    return <MediaRow title={globalize.translate('CinemaTopTen')} items={data} shape='poster' isRanked />;
};

const FavoritesRow: FC = () => {
    const { data } = useFavorites();
    return (
        <MediaRow
            title={globalize.translate('Favorites')}
            items={data}
            shape={isMostlyWide(data) ? 'landscape' : 'poster'}
            getSubtitle={getYear}
        />
    );
};

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
            seeAllTo={appRouter.getRouteUrl(library, { context: library.CollectionType ?? undefined }).substring(1)}
        />
    );
};

const Home: FC = () => {
    useHideLegacyView(true, globalize.translate('Home'));
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
                <Greeting name={user?.Name} />
                <MediaRow
                    title={globalize.translate('HeaderContinueWatching')}
                    items={resumeItems}
                    isPending={resume.isPending}
                    shape='landscape'
                    showProgress
                    canResume
                    getSubtitle={getResumeSubtitle}
                />
                <MediaRow
                    title={globalize.translate('NextUp')}
                    items={nextUpItems}
                    isPending={nextUp.isPending}
                    shape='landscape'
                    getSubtitle={getEpisodeName}
                />
                {/* Everything below loads as it comes near the screen, or in the background once the page has settled */}
                <LazySection hasPlaceholder={false}>
                    <TopTenRow />
                </LazySection>
                {libraries.map((library, i) => (
                    <React.Fragment key={library.Id}>
                        <LazySection shape={LATEST_ROW_SHAPES[library.CollectionType ?? '']}>
                            <LatestRow library={library} />
                        </LazySection>
                        {/* Personal picks sit between the library rows, so they're found early */}
                        <LazySection hasPlaceholder={false}>
                            <BecauseSlot index={i} />
                        </LazySection>
                    </React.Fragment>
                ))}
                <LazySection hasPlaceholder={false}>
                    <FavoritesRow />
                </LazySection>
            </div>
        </div>
    );
};

export default Home;
