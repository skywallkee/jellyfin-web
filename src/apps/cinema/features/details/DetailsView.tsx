import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, useEffect, useRef, useState } from 'react';

import layoutManager from 'components/layoutManager';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { FavoriteButton, PlayedButton } from '../../components/ItemActions';
import ItemMeta from '../../components/ItemMeta';
import MediaRow from '../../components/MediaRow';
import { getBackdropUrl, getLogoUrl, isMostlyWide } from '../../utils/images';
import { formatRuntime, getDisplayTitle, getEpisodeLabel, getPeopleNames, getRemainingTicks, getStreamLanguages } from '../../utils/items';
import { playItem } from '../../utils/actions';

import { useSeasons, useSeriesNextUp, useSimilarItems } from './api';
import CastPanel from './CastPanel';
import EpisodesPanel from './EpisodesPanel';

const SERIES_TYPES = new Set([ 'Series', 'Season', 'Episode' ]);

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

const DetailsView: FC<{ item: ItemDto }> = ({ item }) => {
    const { api } = useApi();
    const isSeriesType = Boolean(item.Type && SERIES_TYPES.has(item.Type));
    const seriesId = item.Type === 'Series' ? item.Id : item.SeriesId;

    const { data: seasons } = useSeasons(isSeriesType ? seriesId : undefined);
    const { data: similar, isPending: isSimilarPending } = useSimilarItems(item.Type === 'Episode' ? undefined : item.Id);
    const { target, isResumable, label: playLabel, nextUpEpisode } = usePlayTarget(item, seriesId);

    const [ chosenSeasonId, setChosenSeasonId ] = useState<string>();
    const playButtonRef = useRef<HTMLButtonElement>(null);

    // On TV, start with the remote on Play
    useEffect(() => {
        if (layoutManager.cinemaTv) playButtonRef.current?.focus({ preventScroll: true });
    }, []);

    const selectedSeasonId = chosenSeasonId ?? getDefaultSeasonId(item, nextUpEpisode, seasons);
    const currentEpisodeId = item.Type === 'Episode' ? item.Id ?? undefined : nextUpEpisode?.Id ?? undefined;

    const backdropUrl = api ? getBackdropUrl(api, item) : undefined;
    const logoUrl = api ? getLogoUrl(api, item) : undefined;
    const title = getDisplayTitle(item);
    const subtitle = getSubtitle(item);
    const tagline = item.Taglines?.[0];
    const facts = getFacts(item);
    const isPlayable = Boolean(item.MediaType === 'Video' || item.Type === 'Series' || item.Type === 'Season');
    const showSimilar = item.Type !== 'Episode' && (isSimilarPending || Boolean(similar?.length));

    return (
        <div className='cinema-details'>
            <div
                className='cinema-hero__backdrop cinema-details__backdrop'
                style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
            />

            <div className='cinema-details__grid'>
                <div className='cinema-details__main'>
                    {logoUrl ?
                        <img className='cinema-hero__logo' src={logoUrl} alt={title} /> :
                        <h1 className='cinema-hero__title'>{title}</h1>}
                    {subtitle && <h2 className='cinema-details__subtitle'>{subtitle}</h2>}
                    {tagline && <p className='cinema-details__tagline'>{tagline}</p>}

                    <ItemMeta item={item} showQuality />

                    {item.Overview && <p className='cinema-details__overview'>{item.Overview}</p>}

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
                        <PlayedButton item={item} />
                        <FavoriteButton item={item} />
                    </div>

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
