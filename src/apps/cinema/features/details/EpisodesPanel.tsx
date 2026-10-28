import classNames from 'classnames';
import React, { type FC, useEffect, useRef } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { getLandscapeUrl } from '../../utils/images';
import { formatRuntime, getRemainingTicks } from '../../utils/items';
import { playItem } from '../../utils/actions';

import { useEpisodes } from './api';

interface EpisodesPanelProps {
    seriesId: string;
    seasons: ItemDto[];
    selectedSeasonId?: string;
    onSelectSeason: (seasonId: string) => void;
    /** The episode to highlight and scroll to, e.g. the next one to watch. */
    currentEpisodeId?: string;
    /** Shown behind each episode still, so a missing still isn't an empty box. */
    fallbackImageUrl?: string;
}

const getEpisodeStatus = (episode: ItemDto) => {
    if (episode.UserData?.Played) return globalize.translate('Watched');
    const remaining = formatRuntime(getRemainingTicks(episode));
    return remaining ? `${remaining} · ${globalize.translate('ButtonResume')}` : undefined;
};

interface EpisodeRowProps {
    episode: ItemDto;
    isCurrent: boolean;
    fallbackImageUrl?: string;
}

const EpisodeRow: FC<EpisodeRowProps> = ({ episode, isCurrent, fallbackImageUrl }) => {
    const { api } = useApi();
    const thumbUrl = api ? getLandscapeUrl(api, episode, 320) : undefined;
    // Layered backgrounds: if the still fails to load, the fallback underneath shows through
    const backgroundImage = [ thumbUrl, fallbackImageUrl ]
        .filter(Boolean)
        .map(url => `url("${url}")`)
        .join(', ');
    const progress = episode.UserData?.Played ? 100 : episode.UserData?.PlayedPercentage ?? 0;
    const isResumable = Boolean(getRemainingTicks(episode) && !episode.UserData?.Played);

    const info = [
        episode.IndexNumber != null ? `E${episode.IndexNumber}` : undefined,
        formatRuntime(episode.RunTimeTicks),
        getEpisodeStatus(episode)
    ].filter(Boolean).join(' · ');

    return (
        <button
            type='button'
            className={classNames('cinema-episode cinema-focusable', { 'is-current': isCurrent })}
            onClick={() => playItem(episode, isResumable)}
            aria-current={isCurrent || undefined}
            data-episode-id={episode.Id}
        >
            <span
                className='cinema-episode__thumb'
                style={backgroundImage ? { backgroundImage } : undefined}
            >
                {progress > 0 && (
                    <span className='cinema-progress cinema-episode__progress'>
                        <span style={{ width: `${Math.round(progress)}%` }} />
                    </span>
                )}
            </span>
            <span className='cinema-episode__text'>
                <span className='cinema-episode__info'>{info}</span>
                <span className='cinema-episode__title'>{episode.Name}</span>
                {episode.Overview && <span className='cinema-episode__overview'>{episode.Overview}</span>}
            </span>
        </button>
    );
};

const EpisodesPanel: FC<EpisodesPanelProps> = ({
    seriesId,
    seasons,
    selectedSeasonId,
    onSelectSeason,
    currentEpisodeId,
    fallbackImageUrl
}) => {
    const { data: episodes, isPending } = useEpisodes(seriesId, selectedSeasonId);
    const listRef = useRef<HTMLDivElement>(null);

    // Bring the current episode into view inside the list (not the page) once episodes load
    useEffect(() => {
        const list = listRef.current;
        if (!list || !currentEpisodeId) return;
        const row = list.querySelector<HTMLElement>(`[data-episode-id="${currentEpisodeId}"]`);
        if (row) list.scrollTop = row.offsetTop - list.offsetTop - 8;
    }, [ currentEpisodeId, episodes ]);

    return (
        <section className='cinema-panel cinema-glass' aria-label={globalize.translate('Episodes')}>
            {seasons.length > 1 && (
                <div className='cinema-seasons' role='tablist' aria-label={globalize.translate('HeaderSeasons')}>
                    {seasons.map(season => (
                        <button
                            key={season.Id}
                            type='button'
                            role='tab'
                            aria-selected={season.Id === selectedSeasonId}
                            className={classNames('cinema-season cinema-focusable', { 'is-active': season.Id === selectedSeasonId })}
                            onClick={() => season.Id && onSelectSeason(season.Id)}
                        >
                            {season.Name}
                        </button>
                    ))}
                </div>
            )}
            {seasons.length === 1 && <h2 className='cinema-panel__title'>{seasons[0].Name}</h2>}

            <div ref={listRef} className='cinema-episodes'>
                {isPending ?
                    Array.from({ length: 3 }, (_, i) => <div key={i} className='cinema-episode cinema-skeleton' />) :
                    episodes?.map(episode => (
                        <EpisodeRow
                            key={episode.Id}
                            episode={episode}
                            isCurrent={episode.Id === currentEpisodeId}
                            fallbackImageUrl={fallbackImageUrl}
                        />
                    ))}
            </div>
        </section>
    );
};

export default EpisodesPanel;
