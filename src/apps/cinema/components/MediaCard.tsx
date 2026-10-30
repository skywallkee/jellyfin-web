import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import PlayArrow from '@mui/icons-material/PlayArrow';
import classNames from 'classnames';
import React, { type CSSProperties, type FC, memo, useState } from 'react';
import { Link } from 'react-router-dom';

import layoutManager from 'components/layoutManager';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { setFocusTint } from '../utils/ambient';
import { brighten, getBlurhashColor, getItemBlurhash, toRgbString, useBlurDataUrl } from '../utils/blurhash';
import { prefersReducedMotion } from '../utils/clip';
import { getLandscapeUrl, getPosterUrl } from '../utils/images';
import { rememberOrigin } from '../utils/originRect';
import { playItem } from '../utils/actions';
import { getDisplayTitle, getEpisodeLabel } from '../utils/items';
import { useIsSpoiler } from '../utils/spoilers';
import { useItemLink } from '../hooks/useItemLink';
import { usePrefetch } from '../hooks/usePrefetch';
import { useRemoveFromResume } from '../hooks/useRemoveFromResume';

import { useHoverPreview } from './HoverPreview';

export type CardShape = 'landscape' | 'poster' | 'square';

/** Image width requested per shape at 1x; a 2x version is offered for sharp screens. */
const IMAGE_WIDTHS: Record<CardShape, number> = { landscape: 420, poster: 260, square: 260 };
/** Cards past this index enter together, so long rows don't take ages to appear. */
const MAX_STAGGER_INDEX = 12;
/** How far a card tips towards the pointer, in degrees. */
const MAX_TILT_DEG = 7;

/** The BlurHash matching the artwork a card shows, for its blurred placeholder. */
const getCardBlurhash = (item: ItemDto, shape: CardShape) => {
    if (shape === 'landscape') {
        return getItemBlurhash(item, 'Thumb', item.ImageTags?.Thumb)
            ?? (item.Type === 'Episode' ? getItemBlurhash(item, 'Primary', item.ImageTags?.Primary) : undefined)
            ?? getItemBlurhash(item, 'Backdrop', item.BackdropImageTags?.[0]);
    }
    return getItemBlurhash(item, 'Primary', item.Type === 'Episode' ? item.SeriesPrimaryImageTag : item.ImageTags?.Primary);
};

let canTilt: boolean | undefined;
/** Tilt only with a real pointer, outside the TV layout, and when motion isn't reduced. */
const isTiltEnabled = () => {
    canTilt ??= !layoutManager.cinemaTv
        && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
        && !prefersReducedMotion();
    return canTilt;
};

/** The card's position, measured once when the pointer arrives rather than on every move. */
const tiltRects = new WeakMap<HTMLElement, DOMRect>();
let tiltFrame = 0;

/** Tips the card towards the pointer and moves a soft light across it, via CSS variables (at most once a frame). */
const onTiltMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !isTiltEnabled()) return;
    const card = e.currentTarget;
    const { clientX, clientY } = e;
    window.cancelAnimationFrame(tiltFrame);
    tiltFrame = window.requestAnimationFrame(() => {
        let rect = tiltRects.get(card);
        if (!rect) {
            rect = card.getBoundingClientRect();
            tiltRects.set(card, rect);
        }
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;
        card.style.setProperty('--cinema-tilt-x', `${((0.5 - y) * MAX_TILT_DEG).toFixed(2)}deg`);
        card.style.setProperty('--cinema-tilt-y', `${((x - 0.5) * MAX_TILT_DEG).toFixed(2)}deg`);
        card.style.setProperty('--cinema-light-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--cinema-light-y', `${(y * 100).toFixed(1)}%`);
        card.classList.add('is-tilting');
    });
};

const onTiltLeave = (e: React.PointerEvent<HTMLElement>) => {
    window.cancelAnimationFrame(tiltFrame);
    // Measured afresh next time, since the row may have scrolled meanwhile
    tiltRects.delete(e.currentTarget);
    e.currentTarget.classList.remove('is-tilting');
};

interface MediaCardProps {
    item: ItemDto;
    shape: CardShape;
    /** Secondary line under the title. */
    subtitle?: string;
    showProgress?: boolean;
    /** Position in its row or grid, used to stagger the entrance animation. */
    index?: number;
    /** Offer a play button on hover that resumes straight away (for Continue Watching). */
    canResume?: boolean;
}

/** Titles added this recently get a "New" tag. */
const NEW_FOR_MS = 10 * 24 * 60 * 60 * 1000;

const isNew = (item: ItemDto) => {
    if (!item.DateCreated || item.UserData?.Played || item.UserData?.PlaybackPositionTicks) return false;
    return Date.now() - new Date(item.DateCreated).getTime() < NEW_FOR_MS;
};

const MediaCard: FC<MediaCardProps> = ({ item, shape, subtitle, showProgress, index = 0, canResume }) => {
    const { api } = useApi();
    const getUrl = shape === 'landscape' ? getLandscapeUrl : getPosterUrl;
    const width = IMAGE_WIDTHS[shape];
    const imageUrl = api && getUrl(api, item, width);
    const imageUrl2x = api && getUrl(api, item, width * 2);
    const [ isLoaded, setIsLoaded ] = useState(false);
    const title = getDisplayTitle(item);
    const episodeLabel = getEpisodeLabel(item);
    const playedPercentage = item.UserData?.PlayedPercentage ?? 0;
    const isPlayed = Boolean(item.UserData?.Played);
    const fullTitle = episodeLabel ? `${title} · ${episodeLabel}` : title;
    // A card with its own play button skips the hover preview, which would cover the button
    const hoverPreview = useHoverPreview();
    const preview = canResume ? null : hoverPreview;
    const unplayedCount = item.Type === 'Series' ? item.UserData?.UnplayedItemCount ?? 0 : 0;
    const { to, state } = useItemLink()(item);
    const blurhash = getCardBlurhash(item, shape);
    const blurUrl = useBlurDataUrl(imageUrl && !isLoaded ? blurhash : undefined);
    const { prefetchItem, cancelPrefetch } = usePrefetch();
    const removeFromResume = useRemoveFromResume();
    const [ isRemoving, setIsRemoving ] = useState(false);
    // The artwork's own colour: it glows under the card and lights the page while the card is chosen
    const color = getBlurhashColor(blurhash);
    const glowColor = color ? toRgbString(brighten(color, 150)) : undefined;
    // Spoiler-free mode blurs the still of an episode not started yet
    const isSpoiler = useIsSpoiler()(item);

    const card = (
        <Link
            to={to}
            state={state}
            className={classNames('cinema-card cinema-focusable', `cinema-card--${shape}`, { 'is-loaded': isLoaded || !imageUrl, 'has-blur': Boolean(blurUrl), 'is-spoiler': isSpoiler })}
            style={{
                '--cinema-i': Math.min(index, MAX_STAGGER_INDEX),
                '--cinema-card-rgb': glowColor,
                backgroundImage: blurUrl ? `url("${blurUrl}")` : undefined
            } as CSSProperties}
            aria-label={subtitle ? `${fullTitle}, ${subtitle}` : fullTitle}
            onMouseEnter={e => {
                preview?.onCardEnter(item, e.currentTarget);
                setFocusTint(color);
                prefetchItem(item);
            }}
            onMouseLeave={() => {
                preview?.onCardLeave();
                setFocusTint();
                cancelPrefetch();
            }}
            onFocus={() => {
                setFocusTint(color);
                prefetchItem(item);
            }}
            onBlur={() => {
                setFocusTint();
                cancelPrefetch();
            }}
            onPointerMove={onTiltMove}
            onPointerLeave={onTiltLeave}
            onClick={e => rememberOrigin(e.currentTarget)}
        >
            {imageUrl ?
                <img
                    className='cinema-card__image'
                    src={imageUrl}
                    srcSet={imageUrl2x ? `${imageUrl} 1x, ${imageUrl2x} 2x` : undefined}
                    alt=''
                    loading='lazy'
                    decoding='async'
                    draggable={false}
                    onLoad={() => setIsLoaded(true)}
                    // A missing image still counts as "done" so the placeholder shimmer stops
                    onError={() => setIsLoaded(true)}
                /> :
                <span className='cinema-card__fallback'>{title}</span>}

            {isPlayed && (
                <span className='cinema-badge cinema-glass' aria-hidden='true'>
                    <Check sx={{ fontSize: 14, verticalAlign: '-2px' }} />
                </span>
            )}
            {unplayedCount > 0 && (
                <span className='cinema-badge cinema-badge--count' aria-hidden='true'>{unplayedCount}</span>
            )}
            {isNew(item) && <span className='cinema-tag' aria-hidden='true'>{globalize.translate('CinemaNew')}</span>}

            <span className='cinema-card__sheen' aria-hidden='true' />

            <span className='cinema-card__shade'>
                <span className='cinema-card__title'>{fullTitle}</span>
                {subtitle && <span className='cinema-card__subtitle'>{subtitle}</span>}
                {showProgress && playedPercentage > 0 && (
                    <span className='cinema-progress'>
                        <span style={{ width: `${Math.round(playedPercentage)}%` }} />
                    </span>
                )}
            </span>
        </Link>
    );

    if (!canResume) return card;

    return (
        <div
            className={classNames('cinema-card-wrap', { 'is-removing': isRemoving })}
            style={{ '--cinema-i': Math.min(index, MAX_STAGGER_INDEX) } as CSSProperties}
        >
            {card}
            <button
                type='button'
                className='cinema-card__remove cinema-glass'
                tabIndex={-1}
                onClick={() => {
                    // The card folds away at once; the row catches up when the server confirms
                    setIsRemoving(true);
                    removeFromResume(item).catch(() => setIsRemoving(false));
                }}
                aria-label={globalize.translate('CinemaRemoveFromRow')}
                title={globalize.translate('CinemaRemoveFromRow')}
            >
                <Close fontSize='small' />
            </button>
            {/* Beside the link rather than inside it: a button can't sit inside a link */}
            <button
                type='button'
                className='cinema-card__play'
                tabIndex={-1}
                onClick={() => playItem(item, true)}
                aria-label={globalize.translate('ButtonResume')}
                title={globalize.translate('ButtonResume')}
            >
                <PlayArrow />
            </button>
        </div>
    );
};

// Cards only re-render when their own item or settings change, not with the rest of the page
export default memo(MediaCard);
