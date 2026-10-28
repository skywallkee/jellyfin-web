import React, { type FC, useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { FavoriteButton } from '../../components/ItemActions';
import MediaRow from '../../components/MediaRow';
import { useAmbientTint } from '../../utils/ambient';
import { getItemColor } from '../../utils/blurhash';
import { getBackdropUrl, getPosterUrl, hasBackdrop, isMostlyWide } from '../../utils/images';

import { usePersonCredits } from './moreApi';
import Overview from './Overview';

const formatDate = (date?: string | null) => (
    date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined
);

/** Age now, or at death. */
const getAge = (born?: string | null, died?: string | null) => {
    if (!born) return undefined;
    const end = died ? new Date(died) : new Date();
    const start = new Date(born);
    let age = end.getFullYear() - start.getFullYear();
    if (end < new Date(end.getFullYear(), start.getMonth(), start.getDate())) age--;
    return age;
};

const getYear = (item: ItemDto) => item.ProductionYear?.toString();

/** A cast or crew member: photo, life facts, biography and everything they're in. */
const PersonView: FC<{ item: ItemDto }> = ({ item }) => {
    const { api } = useApi();
    const { data: credits, isPending } = usePersonCredits(item.Id);

    const groups = useMemo(() => {
        const all = credits ?? [];
        return {
            movies: all.filter(credit => credit.Type === 'Movie' || credit.Type === 'Video'),
            shows: all.filter(credit => credit.Type === 'Series'),
            episodes: all.filter(credit => credit.Type === 'Episode')
        };
    }, [ credits ]);

    // Their best-known artwork sets the scene behind them
    const featured = credits?.find(hasBackdrop);
    useAmbientTint('modal', getItemColor(featured ?? item));
    const backdropUrl = api && featured ? getBackdropUrl(api, featured) : undefined;
    const photoUrl = api ? getPosterUrl(api, item, 500) : undefined;

    const born = formatDate(item.PremiereDate);
    const died = formatDate(item.EndDate);
    const age = getAge(item.PremiereDate, item.EndDate);
    const birthplace = item.ProductionLocations?.[0];
    const facts = [
        born && globalize.translate('CinemaBorn', age != null && !died ? `${born} (${age})` : born),
        birthplace,
        died && globalize.translate('CinemaDied', age != null ? `${died} (${age})` : died)
    ].filter(Boolean);

    return (
        <div className='cinema-details cinema-details--modal cinema-person-view'>
            <div
                className='cinema-hero__backdrop cinema-details__backdrop cinema-person-view__backdrop'
                style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
            />

            <div className='cinema-person-view__header'>
                <span
                    className='cinema-person-view__photo'
                    style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
                >
                    {!photoUrl && (item.Name ?? '?').slice(0, 1)}
                </span>
                <div className='cinema-person-view__text'>
                    <p className='cinema-endscreen__heading'>{globalize.translate('CinemaCastAndCrew')}</p>
                    <h1 className='cinema-hero__title'>{item.Name}</h1>
                    {facts.length > 0 && (
                        <p className='cinema-person-view__facts'>{facts.join(' · ')}</p>
                    )}
                    {credits && credits.length > 0 && (
                        <p className='cinema-person-view__count'>{globalize.translate('CinemaInYourLibrary', credits.length)}</p>
                    )}
                    {item.Overview && <Overview text={item.Overview} />}
                    <div className='cinema-actions'>
                        <FavoriteButton item={item} />
                    </div>
                </div>
            </div>

            <div className='cinema-rows cinema-details__rows'>
                <MediaRow
                    title={globalize.translate('Movies')}
                    items={groups.movies}
                    isPending={isPending}
                    shape={isMostlyWide(groups.movies) ? 'landscape' : 'poster'}
                    getSubtitle={getYear}
                />
                <MediaRow title={globalize.translate('Shows')} items={groups.shows} shape='poster' getSubtitle={getYear} />
                <MediaRow
                    title={globalize.translate('Episodes')}
                    items={groups.episodes}
                    shape='landscape'
                    getSubtitle={episode => episode.Name ?? undefined}
                />
            </div>
        </div>
    );
};

export default PersonView;
