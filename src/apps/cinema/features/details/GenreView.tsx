import classNames from 'classnames';
import React, { type CSSProperties, type FC, useEffect, useMemo, useRef, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import MediaCard from '../../components/MediaCard';
import { useAmbientTint } from '../../utils/ambient';
import { getItemColor } from '../../utils/blurhash';
import { getGenreHue } from '../../utils/genre';
import { getBackdropUrl, hasBackdrop, isMostlyWide } from '../../utils/images';

import { GENRE_PAGE_SIZE, type GenreKind, type GenreSort, useGenreItems } from './moreApi';

const SORTS: { key: GenreSort; labelKey: string }[] = [
    { key: 'popular', labelKey: 'CinemaPopular' },
    { key: 'added', labelKey: 'DateAdded' },
    { key: 'released', labelKey: 'ReleaseDate' },
    { key: 'name', labelKey: 'Name' }
];

const KINDS: { key: GenreKind; labelKey: string }[] = [
    { key: 'all', labelKey: 'All' },
    { key: 'movies', labelKey: 'Movies' },
    { key: 'shows', labelKey: 'Shows' }
];

const SKELETON_COUNT = 12;

/** Loads the next page when the end of the grid comes near, inside the card's own scrolling. */
const useLoadMore = (canLoadMore: boolean, loadMore: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const element = ref.current;
        if (!element || !canLoadMore || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) loadMore();
        }, {
            // The grid scrolls inside the card, so measure against the card for the look-ahead to work
            root: element.closest('.cinema-modal__card'),
            rootMargin: '600px 0px'
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ canLoadMore, loadMore ]);
    return ref;
};

/** A genre: its own colour, sort and type filters, and a grid of everything in it. */
const GenreView: FC<{ item: ItemDto }> = ({ item }) => {
    const { api } = useApi();
    const [ sort, setSort ] = useState<GenreSort>('popular');
    const [ kind, setKind ] = useState<GenreKind>('all');
    const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useGenreItems(item.Id ?? undefined, sort, kind);
    const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [ data ]);
    const total = data?.pages[0]?.total;
    const loadMore = useMemo(() => () => {
        if (!isFetchingNextPage) void fetchNextPage();
    }, [ fetchNextPage, isFetchingNextPage ]);
    const sentinelRef = useLoadMore(Boolean(hasNextPage), loadMore);

    const featured = items.find(hasBackdrop);
    useAmbientTint('modal', getItemColor(featured));
    const backdropUrl = api && featured ? getBackdropUrl(api, featured) : undefined;
    const shape = isMostlyWide(data?.pages[0]?.items) ? 'landscape' : 'poster';

    return (
        <div
            className='cinema-details cinema-details--modal cinema-genre-view'
            style={{ '--cinema-hue': getGenreHue(item.Name ?? '') } as CSSProperties}
        >
            <div
                className='cinema-hero__backdrop cinema-details__backdrop'
                style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
            />

            <header className='cinema-genre-view__header'>
                <p className='cinema-endscreen__heading'>{globalize.translate('Genre')}</p>
                <h1 className='cinema-genre-view__title'>{item.Name}</h1>
                {total != null && <p className='cinema-person-view__count'>{globalize.translate('ItemCount', total)}</p>}

                <div className='cinema-library__toolbar cinema-glass' role='toolbar' aria-label={globalize.translate('Filters')}>
                    <div className='cinema-chipgroup' role='group' aria-label={globalize.translate('LabelSortBy')}>
                        {SORTS.map(option => (
                            <button
                                key={option.key}
                                type='button'
                                className={classNames('cinema-season cinema-focusable', { 'is-active': option.key === sort })}
                                aria-pressed={option.key === sort}
                                onClick={() => setSort(option.key)}
                            >
                                {globalize.translate(option.labelKey)}
                            </button>
                        ))}
                    </div>
                    <span className='cinema-topnav__divider' aria-hidden='true' />
                    <div className='cinema-chipgroup' role='group' aria-label={globalize.translate('Filter')}>
                        {KINDS.map(option => (
                            <button
                                key={option.key}
                                type='button'
                                className={classNames('cinema-season cinema-focusable', { 'is-active': option.key === kind })}
                                aria-pressed={option.key === kind}
                                onClick={() => setKind(option.key)}
                            >
                                {globalize.translate(option.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div
                key={`${sort}-${kind}`}
                className={classNames('cinema-grid cinema-stagger is-visible cinema-genre-view__grid', `cinema-grid--${shape}`)}
            >
                {isPending ?
                    Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <span key={i} className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)} />
                    )) :
                    items.map((genreItem, index) => (
                        <MediaCard
                            key={genreItem.Id}
                            index={index % GENRE_PAGE_SIZE}
                            item={genreItem}
                            shape={shape}
                            subtitle={genreItem.ProductionYear?.toString()}
                            showProgress
                        />
                    ))}
            </div>
            {!isPending && items.length === 0 && (
                <p className='cinema-library__empty'>{globalize.translate('MessageNoItemsAvailable')}</p>
            )}
            <div ref={sentinelRef} className='cinema-library__sentinel' aria-hidden='true' />
        </div>
    );
};

export default GenreView;
