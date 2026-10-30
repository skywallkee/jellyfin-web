import AutoAwesome from '@mui/icons-material/AutoAwesome';
import History from '@mui/icons-material/History';
import Replay from '@mui/icons-material/Replay';
import React, { type CSSProperties, type FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useSeriesGenres, useWatchHistory } from '../features/history/api';
import { buildYearRecap } from '../features/history/recap';
import RecapStories from '../features/history/RecapStories';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { useItemLink } from '../hooks/useItemLink';
import { playItem } from '../utils/actions';
import { getLandscapeUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeLabel } from '../utils/items';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "Today", "Yesterday", "Monday" (this week) or a full date. */
const getDayLabel = (dayStart: number) => {
    const today = startOfDay(new Date());
    const daysAgo = Math.round((today - dayStart) / DAY_MS);
    if (daysAgo === 0) return globalize.translate('CinemaToday');
    if (daysAgo === 1) return globalize.translate('CinemaYesterday');
    const date = new Date(dayStart);
    if (daysAgo < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
};

const groupByDay = (items: ItemDto[]) => {
    const days: { day: number; items: ItemDto[] }[] = [];
    for (const item of items) {
        const day = startOfDay(new Date(item.UserData?.LastPlayedDate ?? 0));
        const last = days[days.length - 1];
        if (last?.day === day) last.items.push(item);
        else days.push({ day, items: [ item ] });
    }
    return days;
};

const HistoryEntry: FC<{ item: ItemDto; index: number }> = ({ item, index }) => {
    const { api } = useApi();
    const getItemLink = useItemLink();
    const thumbUrl = api ? getLandscapeUrl(api, item, 400) : undefined;
    const progress = item.UserData?.Played ? 100 : item.UserData?.PlayedPercentage ?? 0;
    const time = new Date(item.UserData?.LastPlayedDate ?? 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const subtitle = item.Type === 'Episode' ? [ getEpisodeLabel(item), item.Name ].filter(Boolean).join(' · ') : item.ProductionYear?.toString();

    return (
        <li className='cinema-history__entry' style={{ '--cinema-i': Math.min(index, 12) } as CSSProperties}>
            <Link {...getItemLink(item)} className='cinema-history__thumb cinema-focusable' style={thumbUrl ? { backgroundImage: `url("${thumbUrl}")` } : undefined}>
                <span className='cinema-progress'>
                    <span style={{ width: `${Math.round(progress)}%` }} />
                </span>
            </Link>
            <div className='cinema-history__text'>
                <span className='cinema-history__title'>{getDisplayTitle(item)}</span>
                {subtitle && <span className='cinema-history__subtitle'>{subtitle}</span>}
                <span className='cinema-history__time'>
                    {item.UserData?.Played ? globalize.translate('CinemaWatchedAt', time) : globalize.translate('CinemaStoppedAt', time)}
                </span>
            </div>
            <button
                type='button'
                className='cinema-btn cinema-glass cinema-focusable cinema-history__again'
                onClick={() => playItem(item, false)}
            >
                <Replay />
                {globalize.translate('CinemaWatchAgain')}
            </button>
        </li>
    );
};

/** Watch history: everything watched, newest first, grouped by day, with the year's recap. */
const WatchHistory: FC = () => {
    useHideLegacyView(true, globalize.translate('CinemaHistory'));
    const { data: history, isPending } = useWatchHistory();
    const [ isRecapOpen, setIsRecapOpen ] = useState(false);
    const days = useMemo(() => groupByDay(history ?? []), [ history ]);
    const year = new Date().getFullYear();

    const seriesIds = useMemo(() => (
        [ ...new Set((history ?? []).map(item => item.SeriesId).filter((id): id is string => Boolean(id))) ]
    ), [ history ]);
    const { data: series } = useSeriesGenres(seriesIds);
    const recap = useMemo(() => buildYearRecap(history ?? [], year, series), [ history, series, year ]);

    return (
        <div className='cinema-history'>
            <header className='cinema-library__header cinema-history__header'>
                <h1 className='cinema-library__title'>{globalize.translate('CinemaHistory')}</h1>
                {recap.titles > 0 && (
                    <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable cinema-history__recap' onClick={() => setIsRecapOpen(true)}>
                        <AutoAwesome />
                        {globalize.translate('CinemaRecapTitle', String(year))}
                    </button>
                )}
            </header>

            {isPending && <div className='cinema-stats__loading cinema-skeleton' aria-busy='true' />}

            {!isPending && days.length === 0 && (
                <div className='cinema-empty'>
                    <History className='cinema-empty__icon' />
                    <p className='cinema-empty__title'>{globalize.translate('CinemaHistoryEmpty')}</p>
                </div>
            )}

            {days.map(({ day, items }) => (
                <section key={day} className='cinema-history__day' aria-label={getDayLabel(day)}>
                    <h2 className='cinema-row__title'>{getDayLabel(day)}</h2>
                    <ol className='cinema-history__list'>
                        {items.map((item, index) => <HistoryEntry key={item.Id} item={item} index={index} />)}
                    </ol>
                </section>
            ))}

            {isRecapOpen && <RecapStories recap={recap} onClose={() => setIsRecapOpen(false)} />}
        </div>
    );
};

export default WatchHistory;
