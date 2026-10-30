import Favorite from '@mui/icons-material/Favorite';
import LocalMovies from '@mui/icons-material/LocalMovies';
import Schedule from '@mui/icons-material/Schedule';
import Tv from '@mui/icons-material/Tv';
import React, { type CSSProperties, type FC, type ReactNode, useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';

import MediaRow from '../components/MediaRow';
import AchievementBadges from '../features/stats/AchievementBadges';
import { useCinemaStats } from '../features/stats/api';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { prefersReducedMotion } from '../utils/clip';
import { isMostlyWide } from '../utils/images';

const COUNT_UP_MS = 1400;
const FRAME_MS = 16;

/** A number that rolls up from zero, easing out as it reaches its value. */
const useCountUp = (target: number, delayMs = 0) => {
    const [ value, setValue ] = useState(() => (prefersReducedMotion() ? target : 0));

    useEffect(() => {
        if (prefersReducedMotion()) {
            setValue(target);
            return;
        }
        let elapsed = -delayMs;
        // A timer rather than animation frames, so it also finishes in background tabs
        const timer = window.setInterval(() => {
            elapsed += FRAME_MS;
            const progress = Math.min(1, Math.max(0, elapsed / COUNT_UP_MS));
            setValue(target * (1 - Math.pow(1 - progress, 3)));
            if (progress >= 1) window.clearInterval(timer);
        }, FRAME_MS);
        return () => window.clearInterval(timer);
    }, [ delayMs, target ]);

    return value;
};

interface StatTileProps {
    icon: ReactNode;
    value: number;
    labelKey: string;
    index: number;
    decimals?: number;
}

const StatTile: FC<StatTileProps> = ({ icon, value, labelKey, index, decimals = 0 }) => {
    const shown = useCountUp(value, index * 120);
    return (
        <div className='cinema-stat cinema-glass' style={{ '--cinema-i': index } as CSSProperties}>
            <span className='cinema-stat__icon' aria-hidden='true'>{icon}</span>
            <span className='cinema-stat__value'>
                {shown.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
            </span>
            <span className='cinema-stat__label'>{globalize.translate(labelKey)}</span>
        </div>
    );
};

/** How the hours compare with something familiar, for a bit of fun. */
const getHoursLine = (exactHours: number) => {
    // Judge by the same rounded number the tile shows, so the line never contradicts it
    const hours = Math.round(exactHours * 10) / 10;
    if (hours >= 48) return globalize.translate('CinemaStatsDays', Math.round(hours / 24));
    if (hours >= 2) return globalize.translate('CinemaStatsMovieNights', Math.round(hours / 2));
    return globalize.translate('CinemaStatsJustStarted');
};

/** "Your Cinema": watch time, counts, favourite genres and most watched titles. */
const Stats: FC = () => {
    useHideLegacyView(true, globalize.translate('CinemaYourCinema'));
    const { user } = useApi();
    const { data: stats, isPending } = useCinemaStats();
    const topGenreCount = stats?.genres[0]?.count ?? 1;

    return (
        <div className='cinema-stats'>
            <header className='cinema-stats__header'>
                <p className='cinema-settingspage__eyebrow'>{user?.Name}</p>
                <h1 className='cinema-stats__title'>{globalize.translate('CinemaYourCinema')}</h1>
                {stats && <p className='cinema-stats__lede'>{getHoursLine(stats.hours)}</p>}
            </header>

            {isPending && <div className='cinema-stats__loading cinema-skeleton' aria-busy='true' />}

            {stats && (
                <>
                    <div className='cinema-stats__tiles'>
                        <StatTile icon={<Schedule />} value={stats.hours} decimals={stats.hours < 10 ? 1 : 0} labelKey='CinemaStatsHours' index={0} />
                        <StatTile icon={<LocalMovies />} value={stats.movies} labelKey='CinemaStatsTitles' index={1} />
                        <StatTile icon={<Tv />} value={stats.episodes} labelKey='CinemaStatsEpisodes' index={2} />
                        <StatTile icon={<Favorite />} value={stats.favorites} labelKey='Favorites' index={3} />
                    </div>

                    {stats.genres.length > 0 && (
                        <section className='cinema-stats__section'>
                            <h2 className='cinema-row__title'>{globalize.translate('CinemaStatsTopGenres')}</h2>
                            <ol className='cinema-genrebars'>
                                {stats.genres.map((genre, i) => (
                                    <li
                                        key={genre.name}
                                        className='cinema-genrebar'
                                        style={{
                                            '--cinema-share': genre.count / topGenreCount,
                                            '--cinema-i': i
                                        } as CSSProperties}
                                    >
                                        <span className='cinema-genrebar__name'>{genre.name}</span>
                                        <span className='cinema-genrebar__track'>
                                            <span className='cinema-genrebar__fill' />
                                        </span>
                                        <span className='cinema-genrebar__count'>{genre.count}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {stats.facts && <AchievementBadges facts={stats.facts} />}

                    <div className='cinema-rows'>
                        <MediaRow
                            title={globalize.translate('CinemaStatsMostWatched')}
                            items={stats.mostWatched}
                            shape={isMostlyWide(stats.mostWatched) ? 'landscape' : 'poster'}
                            isRanked
                        />
                    </div>

                    {stats.movies + stats.episodes === 0 && (
                        <p className='cinema-library__empty'>{globalize.translate('CinemaStatsEmpty')}</p>
                    )}
                </>
            )}
        </div>
    );
};

export default Stats;
