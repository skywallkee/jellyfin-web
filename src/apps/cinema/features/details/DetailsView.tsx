import PlayArrow from '@mui/icons-material/PlayArrow';
import Theaters from '@mui/icons-material/Theaters';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';

import layoutManager from 'components/layoutManager';
import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import BackgroundClip from '../../components/BackgroundClip';
import { FavoriteButton, PlayedButton } from '../../components/ItemActions';
import ItemMeta from '../../components/ItemMeta';
import MediaRow from '../../components/MediaRow';
import ScoreRings from '../../components/ScoreRings';
import { getBackdropUrl, getLogoUrl, isMostlyWide } from '../../utils/images';
import { formatRuntime, getDisplayTitle, getEpisodeLabel, getPeopleNames, getRemainingTicks, getStreamLanguages } from '../../utils/items';
import { playItem } from '../../utils/actions';
import { useAmbientTint } from '../../utils/ambient';
import { getItemColor } from '../../utils/blurhash';

import { useHideLegacyView } from '../../hooks/useHideLegacyView';

import { useSeasons, useSeriesNextUp, useSimilarItems } from './api';
import CastPanel from './CastPanel';
import Overview from './Overview';
import { useThemeMusic } from './useThemeMusic';
import EpisodesPanel from './EpisodesPanel';

const SERIES_TYPES = new Set([ 'Series', 'Season', 'Episode' ]);
/** How long the artwork shows before a clip starts behind the details. */
const CLIP_DELAY_MS = 2500;
const TICKS_PER_MS = 10_000;

/** "Ends at 11:42 PM": when the title would finish if started (or resumed) now. */
const getEndsAt = (ticks?: number | null) => {
    if (!ticks) return undefined;
    const end = new Date(Date.now() + ticks / TICKS_PER_MS);
    return globalize.translate('EndsAtValue', end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
};

interface Fact {
    label: string;
    value: string;
}

/** Up to three short facts for the glass tiles, skipping any the item doesn't have. */
const getFacts = (item: ItemDto): Fact[] => {
    const facts: Fact[] = [
        { label: globalize.translate('Director'), value: getPeopleNames(item, 'Director') ?? '' },
        { label: globalize.translate('Writer'), value: getPeopleNames(item, 'Writer') ?? '' },
        { label: globalize.translate('Studio'), value: item.Studios?.map(studio => studio.Name).slice(0, 2).join(', ') ?? '' },
        { label: globalize.translate('Audio'), value: getStreamLanguages(item, 'Audio') ?? '' },
        { label: globalize.translate('Subtitles'), value: getStreamLanguages(item, 'Subtitle') ?? '' }
    ];
    return facts.filter(fact => fact.value).slice(0, 3);
};

/** What the main Play button plays: the item itself, or for a show the episode to continue with. */
const usePlayTarget = (item: ItemDto, seriesId?: string | null) => {
    const isShow = item.Type === 'Series' || item.Type === 'Season';
    const { data: nextUp } = useSeriesNextUp(isShow ? seriesId : undefined);
    const target = isShow ? nextUp ?? item : item;
    const remaining = getRemainingTicks(target);
    const isResumable = Boolean(remaining && !target.UserData?.Played);
    const episodeLabel = target !== item || item.Type === 'Episode' ? getEpisodeLabel(target) : undefined;

    let label = globalize.translate(isResumable ? 'ButtonResume' : 'Play');
    if (episodeLabel) label += ` ${episodeLabel}`;
    else if (isResumable) label += ` · ${formatRuntime(remaining)}`;

    return { target, isResumable, label, nextUpEpisode: isShow ? nextUp ?? undefined : undefined };
};

/** Which season's episodes to show first: the item's own season, or the one with the next episode. */
const getDefaultSeasonId = (item: ItemDto, nextUpEpisode?: ItemDto, seasons?: ItemDto[]) => {
    if (item.Type === 'Season') return item.Id ?? undefined;
    if (item.Type === 'Episode') return item.SeasonId ?? undefined;
    return nextUpEpisode?.SeasonId ?? seasons?.[0]?.Id ?? undefined;
};

/** Line under the title: "S2 E5 · Episode name" for episodes, the season name for seasons. */
const getSubtitle = (item: ItemDto) => {
    if (item.Type === 'Episode') return [ getEpisodeLabel(item), item.Name ].filter(Boolean).join(' · ');
    if (item.Type === 'Season') return item.Name ?? undefined;
    return undefined;
};

const playTrailer = (item: ItemDto) => {
    playbackManager.playTrailers(item).catch((err: unknown) => {
        console.error('[Cinema] failed to play trailer', err);
    });
};

interface DetailsViewProps {
    item: ItemDto;
    /** 'page' fills the screen; 'modal' is the details card shown over another page. */
    variant?: 'page' | 'modal';
}

const DetailsView: FC<DetailsViewProps> = ({ item, variant = 'page' }) => {
    // As a card it sits over whatever page is open, so only the full page replaces the previous view
    useHideLegacyView(variant === 'page', getDisplayTitle(item));
    const { api } = useApi();
    const isSeriesType = Boolean(item.Type && SERIES_TYPES.has(item.Type));
    const seriesId = item.Type === 'Series' ? item.Id : item.SeriesId;

    const { data: seasons } = useSeasons(isSeriesType ? seriesId : undefined);
    const { data: similar, isPending: isSimilarPending } = useSimilarItems(item.Type === 'Episode' ? undefined : item.Id);
    const { target, isResumable, label: playLabel, nextUpEpisode } = usePlayTarget(item, seriesId);

    const [ chosenSeasonId, setChosenSeasonId ] = useState<string>();
    useThemeMusic(item);
    // The open card tints the whole screen behind it; the full page tints its own background
    useAmbientTint(variant === 'modal' ? 'modal' : 'page', getItemColor(item));
    const playButtonRef = useRef<HTMLButtonElement>(null);

    // On TV, start with the remote on Play
    useEffect(() => {
        // (unless a screen above the card, like the end screen after playback, has focus)
        if (layoutManager.cinemaTv && !document.querySelector('.cinema-endscreen')) playButtonRef.current?.focus({ preventScroll: true });
    }, []);

    const selectedSeasonId = chosenSeasonId ?? getDefaultSeasonId(item, nextUpEpisode, seasons);
    const currentEpisodeId = item.Type === 'Episode' ? item.Id ?? undefined : nextUpEpisode?.Id ?? undefined;

    const backdropUrl = api ? getBackdropUrl(api, item) : undefined;
    const logoUrl = api ? getLogoUrl(api, item) : undefined;
    // Seasons show the series name here; the season name is the subtitle below
    const title = item.Type === 'Season' ? item.SeriesName ?? getDisplayTitle(item) : getDisplayTitle(item);
    const subtitle = getSubtitle(item);
    const tagline = item.Taglines?.[0];
    const facts = getFacts(item);
    const isPlayable = Boolean(item.MediaType === 'Video' || item.Type === 'Series' || item.Type === 'Season');
    const showSimilar = item.Type !== 'Episode' && (isSimilarPending || Boolean(similar?.length));
    const hasTrailer = Boolean(item.LocalTrailerCount || item.RemoteTrailers?.length);
    const endsAt = isPlayable ? getEndsAt(getRemainingTicks(target) ?? target.RunTimeTicks) : undefined;

    return (
        <div className={classNames('cinema-details', `cinema-details--${variant}`)}>
            <div
                className='cinema-hero__backdrop cinema-details__backdrop'
                style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
            />
            <BackgroundClip
                key={target.Id}
                item={target}
                delayMs={CLIP_DELAY_MS}
                className='cinema-details__clip'
            />

            <div className='cinema-details__grid'>
                <div className='cinema-details__main'>
                    {logoUrl ?
                        <img className='cinema-hero__logo' src={logoUrl} alt={title} /> :
                        <h1 className='cinema-hero__title'>{title}</h1>}
                    {subtitle && <h2 className='cinema-details__subtitle'>{subtitle}</h2>}
                    {tagline && <p className='cinema-details__tagline'>{tagline}</p>}

                    <ItemMeta item={item} showQuality />
                    {endsAt && <p className='cinema-details__endsat'>{endsAt}</p>}

                    {item.Overview && <Overview text={item.Overview} />}

                    <div className='cinema-actions'>
                        {isPlayable && (
                            <button
                                type='button'
                                className='cinema-btn cinema-btn--primary cinema-focusable'
                                onClick={() => playItem(target, isResumable)}
                                ref={playButtonRef}
                            >
                                <PlayArrow />
                                {playLabel}
                            </button>
                        )}
                        {hasTrailer && (
                            <button
                                type='button'
                                className='cinema-btn cinema-glass cinema-focusable'
                                onClick={() => playTrailer(item)}
                            >
                                <Theaters />
                                {globalize.translate('ButtonTrailer')}
                            </button>
                        )}
                        <PlayedButton item={item} />
                        <FavoriteButton item={item} />
                    </div>

                    <ScoreRings item={item} />

                    {facts.length > 0 && (
                        <dl className='cinema-facts'>
                            {facts.map(fact => (
                                <div key={fact.label} className='cinema-fact cinema-glass'>
                                    <dt>{fact.label}</dt>
                                    <dd>{fact.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>

                <div className='cinema-details__side'>
                    {isSeriesType && seriesId && seasons && seasons.length > 0 && (
                        <EpisodesPanel
                            seriesId={seriesId}
                            seasons={seasons}
                            selectedSeasonId={selectedSeasonId}
                            onSelectSeason={setChosenSeasonId}
                            currentEpisodeId={currentEpisodeId}
                            fallbackImageUrl={api ? getBackdropUrl(api, item, 320) : undefined}
                        />
                    )}
                    <CastPanel item={item} />
                </div>
            </div>

            {showSimilar && (
                <div className='cinema-rows cinema-details__rows'>
                    <MediaRow
                        title={globalize.translate('HeaderMoreLikeThis')}
                        items={similar}
                        isPending={isSimilarPending}
                        shape={isMostlyWide(similar) ? 'landscape' : 'poster'}
                        getSubtitle={similarItem => similarItem.ProductionYear?.toString()}
                    />
                </div>
            )}
        </div>
    );
};

export default DetailsView;
