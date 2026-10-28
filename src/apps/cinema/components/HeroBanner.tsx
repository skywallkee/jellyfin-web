import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { getBackdropUrl, getLogoUrl } from '../utils/images';
import { formatRuntime, getDisplayTitle, getRemainingTicks } from '../utils/items';
import { useItemLink } from '../hooks/useItemLink';
import { playItem } from '../utils/actions';

import { FavoriteButton } from './ItemActions';
import ItemMeta from './ItemMeta';

/** How long each featured title stays up before the hero moves to the next one. */
const ROTATE_INTERVAL_MS = 9000;

interface HeroBannerProps {
    items: ItemDto[];
}

interface BackdropLayer {
    key: string;
    url?: string;
}

/**
 * Keeps the previous backdrop under the new one while it fades in, for a true crossfade
 * instead of fading up from black.
 */
const useBackdropLayers = (key: string | undefined, url: string | undefined) => {
    const [ layers, setLayers ] = useState<BackdropLayer[]>([]);
    useEffect(() => {
        if (!key) return;
        setLayers(previous => [
            ...previous.filter(layer => layer.key !== key).slice(-1),
            { key, url }
        ]);
    }, [ key, url ]);
    return layers;
};

const HeroBanner: FC<HeroBannerProps> = ({ items }) => {
    const { api } = useApi();
    const [ index, setIndex ] = useState(0);
    const [ isPaused, setIsPaused ] = useState(false);
    // Bumped when rotation resumes, so the countdown on the active dot restarts with the timer
    const [ cycle, setCycle ] = useState(0);
    const heroRef = useRef<HTMLElement>(null);
    const getItemLink = useItemLink();

    const count = items.length;
    const item = items[Math.min(index, count - 1)];

    // Rotate through featured titles, but hold still while the user is interacting with the hero
    useEffect(() => {
        if (count < 2 || isPaused) return;
        const timer = window.setTimeout(() => setIndex(i => (i + 1) % count), ROTATE_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [ count, isPaused, index, cycle ]);

    const pause = useCallback(() => setIsPaused(true), []);
    const resume = useCallback((e: React.FocusEvent | React.MouseEvent) => {
        if ('relatedTarget' in e && e.relatedTarget instanceof Node && heroRef.current?.contains(e.relatedTarget)) return;
        setIsPaused(false);
        setCycle(c => c + 1);
    }, []);

    const backdropUrl = api && item ? getBackdropUrl(api, item) : undefined;
    const layers = useBackdropLayers(item?.Id ?? undefined, backdropUrl);

    if (!item || !api) return null;

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
            style={{ '--cinema-rotate-ms': `${ROTATE_INTERVAL_MS}ms` } as React.CSSProperties}
        >
            {layers.map(layer => (
                <div
                    key={layer.key}
                    className='cinema-hero__backdrop'
                    style={layer.url ? { backgroundImage: `url("${layer.url}")` } : undefined}
                />
            ))}

            {/* Keyed by item so the text eases in again each time the featured title changes */}
            <div key={`${item.Id}-body`} className='cinema-hero__body'>
                {logoUrl ?
                    <img className='cinema-hero__logo' src={logoUrl} alt={title} /> :
                    <h1 className='cinema-hero__title'>{title}</h1>}

                <ItemMeta item={item} />

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
                        {...getItemLink(item)}
                        className='cinema-btn cinema-glass cinema-focusable'
                    >
                        <InfoOutlined />
                        {globalize.translate('ButtonInfo')}
                    </Link>
                    <FavoriteButton item={item} />
                </div>

                {count > 1 && (
                    <div className={isPaused ? 'cinema-pager is-paused' : 'cinema-pager'}>
                        {items.map((featured, i) => (
                            <button
                                key={featured.Id}
                                type='button'
                                tabIndex={-1}
                                className={i === index ? 'is-active' : undefined}
                                aria-label={getDisplayTitle(featured)}
                                aria-current={i === index}
                                onClick={() => setIndex(i)}
                            >
                                {/* Fills up while the current title is on screen */}
                                {i === index && <span key={`${index}-${cycle}`} className='cinema-pager__fill' />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroBanner;
