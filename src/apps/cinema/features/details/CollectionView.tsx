import Check from '@mui/icons-material/Check';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Replay from '@mui/icons-material/Replay';
import classNames from 'classnames';
import React, { type CSSProperties, type FC } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import MyListButton from '../../components/MyListButton';
import { useItemLink } from '../../hooks/useItemLink';
import { playItem } from '../../utils/actions';
import { useAmbientTint } from '../../utils/ambient';
import { getItemColor } from '../../utils/blurhash';
import { getBackdropUrl, getLogoUrl, getPosterUrl, hasBackdrop } from '../../utils/images';
import { formatRuntime, getDisplayTitle } from '../../utils/items';
import { getCollectionProgress, getNextInCollection, useCollectionItems } from '../collections/api';

/** The main button: start, carry on with the next one, or start over once it's all watched. */
const getPlayLabel = (next: ItemDto | undefined, watched: number) => {
    if (!next) return globalize.translate('CinemaCollectionAgain');
    if (watched === 0) return globalize.translate('CinemaCollectionStart');
    return globalize.translate('CinemaCollectionContinue', getDisplayTitle(next));
};

const Entry: FC<{ entry: ItemDto; index: number; isNext: boolean }> = ({ entry, index, isNext }) => {
    const { api } = useApi();
    const getItemLink = useItemLink();
    const posterUrl = api ? getPosterUrl(api, entry, 240) : undefined;
    const isWatched = Boolean(entry.UserData?.Played);
    const progress = entry.UserData?.PlayedPercentage ?? 0;
    const meta = [ entry.ProductionYear, formatRuntime(entry.RunTimeTicks) ].filter(Boolean).join(' · ');

    return (
        <li
            className={classNames('cinema-collection__entry', { 'is-watched': isWatched, 'is-next': isNext })}
            style={{ '--cinema-i': Math.min(index, 12) } as CSSProperties}
        >
            <span className='cinema-collection__number' aria-hidden='true'>
                {isWatched ? <Check /> : index + 1}
            </span>
            <Link
                {...getItemLink(entry)}
                className='cinema-collection__poster cinema-focusable'
                style={posterUrl ? { backgroundImage: `url("${posterUrl}")` } : undefined}
                aria-label={getDisplayTitle(entry)}
            >
                {progress > 0 && !isWatched && (
                    <span className='cinema-progress'><span style={{ width: `${Math.round(progress)}%` }} /></span>
                )}
            </Link>
            <div className='cinema-collection__text'>
                {isNext && <span className='cinema-collection__badge'>{globalize.translate('CinemaUpNextBadge')}</span>}
                <span className='cinema-collection__title'>{getDisplayTitle(entry)}</span>
                {meta && <span className='cinema-collection__meta'>{meta}</span>}
                {entry.Overview && <span className='cinema-collection__overview'>{entry.Overview}</span>}
            </div>
            <button
                type='button'
                className='cinema-btn cinema-btn--round cinema-glass cinema-focusable'
                onClick={() => playItem(entry, !isWatched && progress > 0)}
                aria-label={`${globalize.translate('Play')} ${getDisplayTitle(entry)}`}
            >
                <PlayArrow />
            </button>
        </li>
    );
};

/** A collection (a saga or franchise): how far along you are, what's next, and every title in order. */
const CollectionView: FC<{ item: ItemDto }> = ({ item }) => {
    const { api } = useApi();
    const { data: items, isPending } = useCollectionItems(item.Id);
    const entries = items ?? [];
    const { watched, total } = getCollectionProgress(entries);
    const next = getNextInCollection(entries);
    const totalTicks = entries.reduce((sum, entry) => sum + (entry.RunTimeTicks ?? 0), 0);

    const art = hasBackdrop(item) ? item : entries.find(hasBackdrop);
    useAmbientTint('modal', getItemColor(art));
    const backdropUrl = api && art ? getBackdropUrl(api, art) : undefined;
    const logoUrl = api && item.ImageTags?.Logo ? getLogoUrl(api, item) : undefined;
    const first = entries[0];

    return (
        <div className='cinema-details cinema-details--modal cinema-collection'>
            <div className='cinema-hero__backdrop cinema-details__backdrop' style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined} />

            <header className='cinema-collection__header'>
                <p className='cinema-endscreen__heading'>{globalize.translate('CinemaCollection')}</p>
                {logoUrl ?
                    <img className='cinema-collection__logo' src={logoUrl} alt={item.Name ?? ''} /> :
                    <h1 className='cinema-genre-view__title'>{item.Name}</h1>}
                {total > 0 && (
                    <p className='cinema-collection__summary'>
                        {[ globalize.translate('CinemaTitlesCount', total), formatRuntime(totalTicks) ].filter(Boolean).join(' · ')}
                    </p>
                )}
                {item.Overview && <p className='cinema-collection__overview cinema-collection__lede'>{item.Overview}</p>}

                {total > 0 && (
                    <div className='cinema-collection__progress' style={{ '--cinema-share': watched / total } as CSSProperties}>
                        <span className='cinema-collection__track'><span /></span>
                        <span>{globalize.translate('CinemaWatchedOf', watched, total)}</span>
                    </div>
                )}

                <div className='cinema-actions'>
                    {(next ?? first) && (
                        <button
                            type='button'
                            className='cinema-btn cinema-btn--primary cinema-focusable'
                            onClick={() => {
                                const target = next ?? first;
                                if (target) playItem(target, Boolean(next && (next.UserData?.PlayedPercentage ?? 0) > 0));
                            }}
                        >
                            {next ? <PlayArrow /> : <Replay />}
                            {getPlayLabel(next, watched)}
                        </button>
                    )}
                    <MyListButton item={item} showLabel />
                </div>
            </header>

            <ol className='cinema-collection__list'>
                {isPending && Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className='cinema-collection__entry cinema-skeleton' />
                ))}
                {entries.map((entry, index) => (
                    <Entry key={entry.Id} entry={entry} index={index} isNext={entry.Id === next?.Id && watched > 0} />
                ))}
            </ol>
            {!isPending && total === 0 && <p className='cinema-library__empty'>{globalize.translate('MessageNoItemsAvailable')}</p>}
        </div>
    );
};

export default CollectionView;
