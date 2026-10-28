import Check from '@mui/icons-material/Check';
import classNames from 'classnames';
import React, { type CSSProperties, type FC, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getLandscapeUrl, getPosterUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeLabel } from '../utils/items';
import { useItemLink } from '../hooks/useItemLink';

import { useHoverPreview } from './HoverPreview';

export type CardShape = 'landscape' | 'poster' | 'square';

/** Image width requested per shape at 1x; a 2x version is offered for sharp screens. */
const IMAGE_WIDTHS: Record<CardShape, number> = { landscape: 420, poster: 260, square: 260 };
/** Cards past this index enter together, so long rows don't take ages to appear. */
const MAX_STAGGER_INDEX = 12;

interface MediaCardProps {
    item: ItemDto;
    shape: CardShape;
    /** Secondary line under the title. */
    subtitle?: string;
    showProgress?: boolean;
    /** Position in its row or grid, used to stagger the entrance animation. */
    index?: number;
}

const MediaCard: FC<MediaCardProps> = ({ item, shape, subtitle, showProgress, index = 0 }) => {
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
    const preview = useHoverPreview();
    const { to, state } = useItemLink()(item);

    return (
        <Link
            to={to}
            state={state}
            className={classNames('cinema-card cinema-focusable', `cinema-card--${shape}`, { 'is-loaded': isLoaded || !imageUrl })}
            style={{ '--cinema-i': Math.min(index, MAX_STAGGER_INDEX) } as CSSProperties}
            aria-label={subtitle ? `${fullTitle}, ${subtitle}` : fullTitle}
            onMouseEnter={preview ? e => preview.onCardEnter(item, e.currentTarget) : undefined}
            onMouseLeave={preview?.onCardLeave}
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
};

export default MediaCard;
