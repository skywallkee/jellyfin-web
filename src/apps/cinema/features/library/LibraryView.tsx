import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import globalize from 'lib/globalize';

import HeroBanner from '../../components/HeroBanner';
import MediaCard from '../../components/MediaCard';
import ScrollTrack from '../../components/ScrollTrack';
import { getBackdropUrl, isMostlyWide } from '../../utils/images';

import { useHideLegacyView } from '../../hooks/useHideLegacyView';

import { DEFAULT_LIBRARY_SORT, type LibraryFilter, PAGE_SIZE, useLibraryGenres, useLibraryItems, useLibrarySpotlight } from './api';

interface SortOption {
    key: string;
    labelKey: string;
    sortBy: ItemSortBy[];
    sortOrder: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
    { key: 'added', labelKey: 'DateAdded', ...DEFAULT_LIBRARY_SORT },
    { key: 'name', labelKey: 'Name', sortBy: [ ItemSortBy.SortName ], sortOrder: SortOrder.Ascending },
    { key: 'released', labelKey: 'ReleaseDate', sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName ], sortOrder: SortOrder.Descending },
    { key: 'rating', labelKey: 'CommunityRating', sortBy: [ ItemSortBy.CommunityRating, ItemSortBy.SortName ], sortOrder: SortOrder.Descending }
];

const FILTER_OPTIONS: { key: LibraryFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'All' },
    { key: 'unplayed', labelKey: 'Unplayed' },
    { key: 'favorites', labelKey: 'Favorites' }
];

const SKELETON_COUNT = 18;
const LETTERS = [ '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ' ];

interface LetterBarProps {
    letter?: string;
    onChange: (letter?: string) => void;
}

/** A–Z along the side when sorted by name: jump to (filter by) a starting letter. */
const LetterBar: FC<LetterBarProps> = ({ letter, onChange }) => (
    <nav className='cinema-letters cinema-glass' aria-label={globalize.translate('CinemaJumpToLetter')}>
        {LETTERS.map(entry => (
            <button
                key={entry}
                type='button'
                className={classNames('cinema-letters__letter cinema-focusable', { 'is-active': entry === letter })}
                aria-pressed={entry === letter}
                onClick={() => onChange(entry === letter ? undefined : entry)}
            >
                {entry}
            </button>
        ))}
    </nav>
);

interface ChipProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const Chip: FC<ChipProps> = ({ isActive, onClick, children }) => (
    <button
        type='button'
        className={classNames('cinema-season cinema-focusable', { 'is-active': isActive })}
        aria-pressed={isActive}
        onClick={onClick}
    >
        {children}
    </button>
);

/** Loads the next page when the end of the grid scrolls near the viewport. */
const useLoadMoreOnScroll = (canLoadMore: boolean, loadMore: () => void) => {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const supportsObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !canLoadMore || !supportsObserver) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) loadMore();
        }, { rootMargin: '800px 0px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [ canLoadMore, loadMore, supportsObserver ]);

    return { sentinelRef, needsButton: canLoadMore && !supportsObserver };
};

interface LibraryViewProps {
    parentId: string;
    itemTypes: BaseItemKind[];
}

const LibraryView: FC<LibraryViewProps> = ({ parentId, itemTypes }) => {
    const { api } = useApi();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const { data: library } = useItem(parentId);
    useHideLegacyView(true, library?.Name);
    const { data: genres } = useLibraryGenres(parentId, itemTypes);
    const { data: spotlight } = useLibrarySpotlight(parentId, itemTypes);
    const hasSpotlight = Boolean(spotlight?.length);

    const sort = SORT_OPTIONS.find(option => option.key === searchParams.get('sort')) ?? SORT_OPTIONS[0];
    const filter = (FILTER_OPTIONS.find(option => option.key === searchParams.get('filter'))?.key) ?? 'all';
    const genreId = searchParams.get('genreId') ?? undefined;
    const isByName = sort.key === 'name';
    // The letter only applies while sorted by name, where the bar is shown
    const letter = isByName ? searchParams.get('letter') ?? undefined : undefined;

    // Keep choices in the URL so Back returns to the same view
    const setParam = useCallback((key: string, value?: string) => {
        setSearchParams(params => {
            const next = new URLSearchParams(params);
            if (value) next.set(key, value);
            else next.delete(key);
            return next;
        }, { replace: true });
    }, [ setSearchParams ]);

    const query = useMemo(() => ({
        parentId,
        itemTypes,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
        filter,
        genreId,
        letter
    }), [ filter, genreId, itemTypes, letter, parentId, sort ]);

    const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useLibraryItems(query);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);
    const total = data?.pages[0]?.total;

    const loadMore = useCallback(() => {
        if (!isFetchingNextPage) void fetchNextPage();
    }, [ fetchNextPage, isFetchingNextPage ]);
    const { sentinelRef, needsButton } = useLoadMoreOnScroll(Boolean(hasNextPage), loadMore);

    const shape = isMostlyWide(data?.pages[0]?.items) ? 'landscape' : 'poster';
    const backdropItem = items.find(item => item.BackdropImageTags?.length) ?? items[0];
    const backdropUrl = api && backdropItem ? getBackdropUrl(api, backdropItem) : undefined;

    return (
        <div className='cinema-library'>
            {hasSpotlight && spotlight ?
                <HeroBanner items={spotlight} isCompact /> :
                <div
                    className='cinema-library__backdrop'
                    style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
                />}

            <header className='cinema-library__header'>
                <h1 className='cinema-library__title'>{library?.Name ?? ' '}</h1>
                {total != null && (
                    <span className='cinema-row__count'>{globalize.translate('ItemCount', total)}</span>
                )}
            </header>

            <div className='cinema-library__toolbar cinema-glass' role='toolbar' aria-label={globalize.translate('Filters')}>
                <div className='cinema-chipgroup' role='group' aria-label={globalize.translate('LabelSortBy')}>
                    {SORT_OPTIONS.map(option => (
                        <Chip
                            key={option.key}
                            isActive={option.key === sort.key}
                            onClick={() => setParam('sort', option.key === SORT_OPTIONS[0].key ? undefined : option.key)}
                        >
                            {globalize.translate(option.labelKey)}
                        </Chip>
                    ))}
                </div>
                <span className='cinema-topnav__divider' aria-hidden='true' />
                <div className='cinema-chipgroup' role='group' aria-label={globalize.translate('Filter')}>
                    {FILTER_OPTIONS.map(option => (
                        <Chip
                            key={option.key}
                            isActive={option.key === filter}
                            onClick={() => setParam('filter', option.key === 'all' ? undefined : option.key)}
                        >
                            {globalize.translate(option.labelKey)}
                        </Chip>
                    ))}
                </div>
            </div>

            {genres && genres.length > 0 && (
                <ScrollTrack className='cinema-chipgroup cinema-library__genres' label={globalize.translate('Genres')}>
                    <Chip isActive={!genreId} onClick={() => setParam('genreId')}>
                        {globalize.translate('All')}
                    </Chip>
                    {genres.map(genre => (
                        <Chip
                            key={genre.Id}
                            isActive={genre.Id === genreId}
                            onClick={() => setParam('genreId', genre.Id === genreId ? undefined : genre.Id ?? undefined)}
                        >
                            {genre.Name}
                        </Chip>
                    ))}
                </ScrollTrack>
            )}

            {isByName && (
                <LetterBar
                    letter={letter}
                    onChange={next => {
                        setParam('letter', next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                />
            )}

            <div
                // Re-keyed per filter so a new set of results plays its entrance instead of popping in
                key={`${sort.key}-${filter}-${genreId ?? ''}-${letter ?? ''}`}
                className={classNames('cinema-grid cinema-stagger is-visible', `cinema-grid--${shape}`, { 'has-letters': isByName })}
            >
                {isPending ?
                    Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <span key={i} className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)} />
                    )) :
                    items.map((item, index) => (
                        <MediaCard
                            key={item.Id}
                            // Pages after the first stagger from their own start, not from item 60+
                            index={index % PAGE_SIZE}
                            item={item}
                            shape={shape}
                            subtitle={item.ProductionYear?.toString()}
                            showProgress
                        />
                    ))}
            </div>

            {!isPending && items.length === 0 && (
                <p className='cinema-library__empty'>{globalize.translate('MessageNoItemsAvailable')}</p>
            )}

            <div ref={sentinelRef} className='cinema-library__sentinel' aria-hidden='true' />
            {needsButton && (
                <div className='cinema-library__more'>
                    <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={loadMore}>
                        {globalize.translate('ButtonMore')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LibraryView;
