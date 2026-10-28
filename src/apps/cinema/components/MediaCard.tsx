import Check from '@mui/icons-material/Check';
import classNames from 'classnames';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getLandscapeUrl, getPosterUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeLabel } from '../utils/items';
import { getItemPath } from '../utils/actions';

export type CardShape = 'landscape' | 'poster' | 'square';

interface MediaCardProps {
    item: ItemDto;
    shape: CardShape;
    /** Secondary line under the title. */
    subtitle?: string;
    showProgress?: boolean;
}

const MediaCard: FC<MediaCardProps> = ({ item, shape, subtitle, showProgress }) => {
    const { api } = useApi();
    const imageUrl = api && (shape === 'landscape' ? getLandscapeUrl(api, item) : getPosterUrl(api, item));
    const title = getDisplayTitle(item);
    const episodeLabel = getEpisodeLabel(item);
    const playedPercentage = item.UserData?.PlayedPercentage ?? 0;
    const isPlayed = Boolean(item.UserData?.Played);
    const fullTitle = episodeLabel ? `${title} · ${episodeLabel}` : title;

    return (
        <Link
            to={getItemPath(item)}
            className={classNames('cinema-card cinema-focusable', `cinema-card--${shape}`)}
            style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
            aria-label={subtitle ? `${fullTitle}, ${subtitle}` : fullTitle}
        >
            {!imageUrl && <span className='cinema-card__fallback'>{title}</span>}

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
