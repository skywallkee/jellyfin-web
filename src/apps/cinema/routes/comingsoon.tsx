import EventAvailable from '@mui/icons-material/EventAvailable';
import React, { type CSSProperties, type FC, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { getAirLabel, useUpcomingEpisodes } from '../features/comingsoon/api';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { useItemLink } from '../hooks/useItemLink';
import { getLandscapeUrl } from '../utils/images';
import { getEpisodeLabel } from '../utils/items';

/** Groups episodes by the day they air, keeping the soonest first. */
const groupByAirDay = (episodes: ItemDto[]) => {
    const days: { label: string; date?: string | null; episodes: ItemDto[] }[] = [];
    for (const episode of episodes) {
        const label = getAirLabel(episode.PremiereDate);
        const last = days[days.length - 1];
        if (last?.label === label) last.episodes.push(episode);
        else days.push({ label, date: episode.PremiereDate, episodes: [ episode ] });
    }
    return days;
};

const UpcomingEpisode: FC<{ episode: ItemDto; index: number }> = ({ episode, index }) => {
    const { api } = useApi();
    const getItemLink = useItemLink();
    const imageUrl = api ? getLandscapeUrl(api, episode, 480) : undefined;
    const time = episode.PremiereDate ?
        new Date(episode.PremiereDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) :
        undefined;

    return (
        <Link
            {...getItemLink({ Id: episode.SeriesId, Type: 'Series', ServerId: episode.ServerId } as ItemDto)}
            className='cinema-upcoming cinema-focusable'
            style={{ '--cinema-i': Math.min(index, 12) } as CSSProperties}
        >
            <span className='cinema-upcoming__thumb' style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined} />
            <span className='cinema-upcoming__text'>
                <span className='cinema-upcoming__series'>{episode.SeriesName}</span>
                <span className='cinema-upcoming__title'>{[ getEpisodeLabel(episode), episode.Name ].filter(Boolean).join(' · ')}</span>
                {episode.Overview && <span className='cinema-upcoming__overview'>{episode.Overview}</span>}
            </span>
            {time && <span className='cinema-upcoming__time'>{time}</span>}
        </Link>
    );
};

/** Coming soon: new episodes of the user's shows, by the day they air. */
const ComingSoon: FC = () => {
    useHideLegacyView(true, globalize.translate('CinemaComingSoon'));
    const { data: episodes, isPending } = useUpcomingEpisodes();
    const days = useMemo(() => groupByAirDay(episodes ?? []), [ episodes ]);

    return (
        <div className='cinema-history cinema-comingsoon'>
            <header className='cinema-library__header'>
                <h1 className='cinema-library__title'>{globalize.translate('CinemaComingSoon')}</h1>
            </header>

            {isPending && <div className='cinema-stats__loading cinema-skeleton' aria-busy='true' />}

            {!isPending && days.length === 0 && (
                <div className='cinema-empty'>
                    <EventAvailable className='cinema-empty__icon' />
                    <p className='cinema-empty__title'>{globalize.translate('CinemaComingSoonEmpty')}</p>
                    <p className='cinema-empty__text'>{globalize.translate('CinemaComingSoonEmptyHelp')}</p>
                </div>
            )}

            {days.map(day => (
                <section key={day.label} className='cinema-history__day' aria-label={day.label}>
                    <h2 className='cinema-row__title'>{day.label}</h2>
                    <div className='cinema-upcoming__list'>
                        {day.episodes.map((episode, index) => <UpcomingEpisode key={episode.Id} episode={episode} index={index} />)}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default ComingSoon;
