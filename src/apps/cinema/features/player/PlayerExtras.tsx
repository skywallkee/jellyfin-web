import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import { getMediaInfoApi } from '@jellyfin/sdk/lib/utils/api/media-info-api';
import Close from '@mui/icons-material/Close';
import Insights from '@mui/icons-material/Insights';
import PlayArrow from '@mui/icons-material/PlayArrow';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import ViewCarousel from '@mui/icons-material/ViewCarousel';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import globalize from 'lib/globalize';
import inputManager from 'scripts/inputManager';
import type { ItemDto } from 'types/base/models/item-dto';

import { useOverlay } from '../../hooks/useOverlay';
import { getLandscapeUrl } from '../../utils/images';
import { formatRuntime, getEpisodeLabel } from '../../utils/items';
import { useIsSpoiler } from '../../utils/spoilers';

import { useEpisodesFrom, useNowPlaying, usePlaybackPosition } from './api';
import { SleepButton, SleptNote, StillWatching, useSleepTimer, useStillWatching } from './Bedtime';

type Panel = 'episodes' | 'chapters';
/** Small menus that open above their button, rather than the side panel. */
type Menu = 'sleep';

/** How far into an episode before the next one is warmed up, so it starts sooner. */
const WARM_UP_FRACTION = 0.85;

const formatTimestamp = (ticks?: number | null) => {
    const seconds = Math.floor((ticks ?? 0) / 10_000_000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** The episode list: the one playing and everything after it; picking one plays it instead. */
const EpisodesPanel: FC<{ current: ItemDto; onPicked: () => void }> = ({ current, onPicked }) => {
    const { api } = useApi();
    const { data: episodes, isPending } = useEpisodesFrom(current);
    const listRef = useRef<HTMLOListElement>(null);
    const isSpoiler = useIsSpoiler();
    let lastSeason: number | null | undefined;

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>('.is-current')?.focus({ preventScroll: true });
    }, [ episodes ]);

    return (
        <ol ref={listRef} className='cinema-pextras__list'>
            {/* Placeholders while loading have nothing but their position to tell them apart */}
            { }
            {isPending && Array.from({ length: 4 }, (_, i) => <li key={i} className='cinema-pextras__episode cinema-skeleton' />)}
            {episodes?.map(episode => {
                const isCurrent = episode.Id === current.Id;
                const showSeason = episode.ParentIndexNumber !== lastSeason;
                lastSeason = episode.ParentIndexNumber;
                const thumbUrl = api ? getLandscapeUrl(api, episode, 400) : undefined;
                const progress = episode.UserData?.Played ? 100 : episode.UserData?.PlayedPercentage ?? 0;
                const isHidden = !isCurrent && isSpoiler(episode);
                return (
                    <React.Fragment key={episode.Id}>
                        {showSeason && episode.SeasonName && <li className='cinema-pextras__season'>{episode.SeasonName}</li>}
                        <li>
                            <button
                                type='button'
                                className={classNames('cinema-pextras__episode cinema-focusable', { 'is-current': isCurrent, 'is-spoiler': isHidden })}
                                onClick={() => {
                                    onPicked();
                                    if (!isCurrent) {
                                        playbackManager.play({ items: [ episode ] }).catch((err: unknown) => {
                                            console.error('[Cinema] failed to switch episode', err);
                                        });
                                    }
                                }}
                                aria-current={isCurrent || undefined}
                            >
                                <span className='cinema-pextras__thumb' style={thumbUrl ? { backgroundImage: `url("${thumbUrl}")` } : undefined}>
                                    {isCurrent ?
                                        <span className='cinema-pextras__now'>{globalize.translate('CinemaNowPlaying')}</span> :
                                        <PlayArrow className='cinema-pextras__play' />}
                                    {progress > 0 && (
                                        <span className='cinema-progress'><span style={{ width: `${Math.round(progress)}%` }} /></span>
                                    )}
                                </span>
                                <span className='cinema-pextras__text'>
                                    <span className='cinema-pextras__title'>
                                        {[ getEpisodeLabel(episode), episode.Name ].filter(Boolean).join(' · ')}
                                    </span>
                                    {Boolean(episode.RunTimeTicks) && <span className='cinema-pextras__meta'>{formatRuntime(episode.RunTimeTicks)}</span>}
                                    {episode.Overview && (
                                        <span className='cinema-pextras__overview'>
                                            {isHidden ? globalize.translate('CinemaSpoilerHidden') : episode.Overview}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    </React.Fragment>
                );
            })}
        </ol>
    );
};

/** Chapter thumbnails; picking one jumps there. The chapter being watched is highlighted. */
const ChaptersPanel: FC<{ item: ItemDto; onPicked: () => void }> = ({ item, onPicked }) => {
    const { api } = useApi();
    const position = usePlaybackPosition(true);
    const chapters = item.Chapters ?? [];
    const currentIndex = chapters.reduce((found, chapter, index) => (
        (chapter.StartPositionTicks ?? 0) <= position ? index : found
    ), 0);

    return (
        <ol className='cinema-pextras__chapters'>
            {chapters.map((chapter, index) => {
                const imageUrl = api && item.Id && chapter.ImageTag ?
                    getImageApi(api).getItemImageUrlById(item.Id, ImageType.Chapter, { tag: chapter.ImageTag, imageIndex: index, maxWidth: 400 }) :
                    undefined;
                return (
                    // Chapters have no id; their start time (and order, for twins) identifies them
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={`${chapter.StartPositionTicks}-${index}`}>
                        <button
                            type='button'
                            className={classNames('cinema-pextras__chapter cinema-focusable', { 'is-current': index === currentIndex })}
                            onClick={() => {
                                playbackManager.seek(chapter.StartPositionTicks ?? 0);
                                onPicked();
                            }}
                        >
                            <span className='cinema-pextras__thumb' style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined} />
                            <span className='cinema-pextras__title'>{chapter.Name || globalize.translate('CinemaChapterNumber', index + 1)}</span>
                            <span className='cinema-pextras__meta'>{formatTimestamp(chapter.StartPositionTicks)}</span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
};

/**
 * Near the end of an episode, asks the server to prepare the next one (it reads the file's
 * details then), and loads its artwork, so "Next episode" starts noticeably faster.
 */
const useWarmUpNext = (item?: ItemDto) => {
    const { api, user } = useApi();
    const position = usePlaybackPosition(Boolean(item?.RunTimeTicks));
    const warmedRef = useRef<string>();

    useEffect(() => {
        if (!api || !user?.Id || !item?.RunTimeTicks || warmedRef.current === item.Id) return;
        if (position < item.RunTimeTicks * WARM_UP_FRACTION) return;
        warmedRef.current = item.Id ?? undefined;
        const next = (playbackManager.getNextItem() as { item?: ItemDto } | null)?.item;
        if (!next?.Id) return;
        getMediaInfoApi(api).getPostedPlaybackInfo({ itemId: next.Id, userId: user.Id }).catch(() => { /* only a warm-up */ });
        const imageUrl = getLandscapeUrl(api, next, 1280);
        if (imageUrl) new Image().src = imageUrl;
    }, [ api, item, position, user?.Id ]);
};

/**
 * Cinema's extra buttons in the video player, beside its own controls: Episodes (the rest of the
 * series, to switch to), Chapters (jump between scenes) and Stats (the technical details of
 * the stream). They show and hide together with the player's controls.
 */
const PlayerExtras: FC = () => {
    const nowPlaying = useNowPlaying();
    // The full item has chapters, which the player's copy may not
    const { data: fullItem } = useItem(nowPlaying?.Id ?? undefined);
    const item = fullItem ?? nowPlaying;
    const [ panel, setPanel ] = useState<Panel>();
    const [ menu, setMenu ] = useState<Menu>();
    const close = () => setPanel(undefined);
    const closeMenu = () => setMenu(undefined);
    useOverlay(Boolean(panel), close);
    useOverlay(Boolean(menu), closeMenu);
    useWarmUpNext(item);
    const sleep = useSleepTimer(item);
    const stillWatching = useStillWatching(item);

    if (!item) return null;
    const hasEpisodes = item.Type === 'Episode' && Boolean(item.SeriesId);
    const hasChapters = (item.Chapters?.length ?? 0) > 1;

    const toggle = (next: Panel) => setPanel(current => (current === next ? undefined : next));

    return (
        <>
            <div className={classNames('cinema-pextras', { 'is-open': Boolean(panel ?? menu) })}>
                <SleepButton
                    timer={sleep}
                    isOpen={menu === 'sleep'}
                    onToggle={() => setMenu(current => (current === 'sleep' ? undefined : 'sleep'))}
                    onClose={closeMenu}
                />
                <button
                    type='button'
                    className='cinema-pextras__btn cinema-focusable'
                    onClick={() => inputManager.handleCommand('togglestats', {})}
                    aria-label={globalize.translate('CinemaStatsForNerds')}
                    title={globalize.translate('CinemaStatsForNerds')}
                >
                    <Insights />
                </button>
                {hasChapters && (
                    <button
                        type='button'
                        className={classNames('cinema-pextras__btn cinema-focusable', { 'is-active': panel === 'chapters' })}
                        onClick={() => toggle('chapters')}
                        aria-expanded={panel === 'chapters'}
                    >
                        <ViewCarousel />
                        <span>{globalize.translate('CinemaChapters')}</span>
                    </button>
                )}
                {hasEpisodes && (
                    <button
                        type='button'
                        className={classNames('cinema-pextras__btn cinema-focusable', { 'is-active': panel === 'episodes' })}
                        onClick={() => toggle('episodes')}
                        aria-expanded={panel === 'episodes'}
                    >
                        <VideoLibrary />
                        <span>{globalize.translate('Episodes')}</span>
                    </button>
                )}
            </div>

            {panel && (
                <aside className='cinema-pextras__panel cinema-glass' aria-label={globalize.translate(panel === 'episodes' ? 'Episodes' : 'CinemaChapters')}>
                    <header className='cinema-pextras__header'>
                        <div>
                            <p className='cinema-endscreen__heading'>{globalize.translate(panel === 'episodes' ? 'CinemaUpNextList' : 'CinemaChapters')}</p>
                            <h2>{panel === 'episodes' ? item.SeriesName : item.Name}</h2>
                        </div>
                        <button type='button' className='cinema-iconbtn cinema-focusable' onClick={close} aria-label={globalize.translate('ButtonClose')}>
                            <Close />
                        </button>
                    </header>
                    {panel === 'episodes' ?
                        <EpisodesPanel current={item} onPicked={close} /> :
                        <ChaptersPanel item={item} onPicked={close} />}
                </aside>
            )}

            {sleep.hasSlept && <SleptNote onDismiss={sleep.dismissSlept} />}
            {stillWatching.isAsking && (
                <StillWatching item={item} onContinue={stillWatching.keepWatching} onStop={stillWatching.stop} />
            )}
        </>
    );
};

export default PlayerExtras;
