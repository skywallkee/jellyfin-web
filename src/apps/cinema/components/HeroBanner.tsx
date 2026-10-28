import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import { useToggleFavoriteMutation } from 'hooks/useFetchItems';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { getBackdropUrl, getLogoUrl } from '../utils/images';
import { formatRuntime, getDisplayTitle, getEpisodeLabel, getItemPath, getRemainingTicks, playItem } from '../utils/items';

/** How long each featured title stays up before the hero moves to the next one. */
const ROTATE_INTERVAL_MS = 9000;

interface HeroBannerProps {
    items: ItemDto[];
}

const HeroMeta: FC<{ item: ItemDto }> = ({ item }) => {
    const parts = [
        getEpisodeLabel(item),
        formatRuntime(item.RunTimeTicks),
        item.Genres?.slice(0, 2).join(' · '),
        item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : undefined
    ].filter(Boolean);

    return (
        <div className='cinema-meta'>
            {item.ProductionYear && <span className='cinema-chip cinema-glass'>{item.ProductionYear}</span>}
            {item.OfficialRating && <span className='cinema-chip cinema-glass'>{item.OfficialRating}</span>}
            {parts.map((part, i) => (
                <React.Fragment key={part}>
                    {i > 0 && <span className='cinema-dot' aria-hidden='true' />}
                    <span>{part}</span>
                </React.Fragment>
            ))}
        </div>
    );
};

const FavoriteButton: FC<{ item: ItemDto }> = ({ item }) => {
    const [ isFavorite, setIsFavorite ] = useState(Boolean(item.UserData?.IsFavorite));
    const { mutate } = useToggleFavoriteMutation();

    useEffect(() => {
        setIsFavorite(Boolean(item.UserData?.IsFavorite));
    }, [ item ]);

    const onClick = useCallback(() => {
        if (!item.Id) return;
        const wasFavorite = isFavorite;
        setIsFavorite(!wasFavorite);
        mutate(
            { itemId: item.Id, isFavorite: wasFavorite },
            { onError: () => setIsFavorite(wasFavorite) }
        );
    }, [ isFavorite, item.Id, mutate ]);

    return (
        <button
            type='button'
            className='cinema-btn cinema-btn--round cinema-glass cinema-focusable'
            onClick={onClick}
            aria-pressed={isFavorite}
            aria-label={globalize.translate('Favorite')}
        >
            {isFavorite ? <Favorite /> : <FavoriteBorder />}
        </button>
    );
};

const HeroBanner: FC<HeroBannerProps> = ({ items }) => {
    const { api } = useApi();
    const [ index, setIndex ] = useState(0);
    const [ isPaused, setIsPaused ] = useState(false);
    const heroRef = useRef<HTMLElement>(null);

    const count = items.length;
    const item = items[Math.min(index, count - 1)];

    // Rotate through featured titles, but hold still while the user is interacting with the hero
    useEffect(() => {
        if (count < 2 || isPaused) return;
        const timer = window.setInterval(() => setIndex(i => (i + 1) % count), ROTATE_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, [ count, isPaused ]);

    const pause = useCallback(() => setIsPaused(true), []);
    const resume = useCallback((e: React.FocusEvent | React.MouseEvent) => {
        if ('relatedTarget' in e && e.relatedTarget instanceof Node && heroRef.current?.contains(e.relatedTarget)) return;
        setIsPaused(false);
    }, []);

    if (!item || !api) return null;

    const backdropUrl = getBackdropUrl(api, item);
    const logoUrl = getLogoUrl(api, item);
    const title = getDisplayTitle(item);
    const remainingTicks = getRemainingTicks(item);
    const isResumable = Boolean(remainingTicks && item.UserData?.PlaybackPositionTicks);
    const playLabel = isResumable ?
        `${globalize.translate('ButtonResume')} · ${formatRuntime(remainingTicks)}` :
        globalize.translate('Play');

    return (
        <section
            ref={heroRef}
            className='cinema-hero'
            aria-roledescription='carousel'
            aria-label={title}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
        >
            <div
                key={item.Id}
                className='cinema-hero__backdrop'
                style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
            />

            <div className='cinema-hero__body'>
                {logoUrl ?
                    <img className='cinema-hero__logo' src={logoUrl} alt={title} /> :
                    <h1 className='cinema-hero__title'>{title}</h1>}

                <HeroMeta item={item} />

                {item.Overview && <p className='cinema-hero__overview'>{item.Overview}</p>}

                <div className='cinema-actions'>
                    <button
                        type='button'
                        className='cinema-btn cinema-btn--primary cinema-focusable'
                        onClick={() => playItem(item, isResumable)}
                    >
                        <PlayArrow />
                        {playLabel}
                    </button>
                    <Link
                        to={getItemPath(item)}
                        className='cinema-btn cinema-glass cinema-focusable'
                    >
                        <InfoOutlined />
                        {globalize.translate('ButtonInfo')}
                    </Link>
                    <FavoriteButton item={item} />
                </div>

                {count > 1 && (
                    <div className='cinema-pager'>
                        {items.map((featured, i) => (
                            <button
                                key={featured.Id}
                                type='button'
                                tabIndex={-1}
                                className={i === index ? 'is-active' : undefined}
                                aria-label={getDisplayTitle(featured)}
                                aria-current={i === index}
                                onClick={() => setIndex(i)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroBanner;
