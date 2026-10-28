import Close from '@mui/icons-material/Close';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';
import Events from 'utils/events';

import ItemMeta from '../../components/ItemMeta';
import MediaCard from '../../components/MediaCard';
import ScrollTrack from '../../components/ScrollTrack';
import { useItemLink } from '../../hooks/useItemLink';
import { useOverlay } from '../../hooks/useOverlay';
import { playItem } from '../../utils/actions';
import { useAmbientTint } from '../../utils/ambient';
import { getItemColor } from '../../utils/blurhash';
import { getBackdropUrl, getLandscapeUrl, getLogoUrl, isMostlyWide } from '../../utils/images';
import { formatRuntime, getDisplayTitle, getEpisodeLabel } from '../../utils/items';

import { useAlsoWatch, useFollowingEpisode } from './api';

/** Watched this far into a title, it counts as finished rather than stopped part-way. */
const FINISHED_FRACTION = 0.9;

interface StopInfo {
    nextItem?: unknown;
    state?: {
        NowPlayingItem?: ItemDto;
        PlayState?: { PositionTicks?: number | null };
    };
}

/** True when playback stopped because the title was watched to (nearly) the end. */
const isFinished = (info: StopInfo) => {
    const item = info.state?.NowPlayingItem;
    const position = info.state?.PlayState?.PositionTicks ?? 0;
    const runtime = item?.RunTimeTicks ?? 0;
    return Boolean(item && item.MediaType === 'Video' && runtime && position >= runtime * FINISHED_FRACTION);
};

/** The title that just finished playing, when nothing else is queued after it. */
const useFinishedItem = () => {
    const [ finished, setFinished ] = useState<ItemDto>();

    useEffect(() => {
        const onStop = (_e: unknown, info: StopInfo) => {
            // A queued next episode plays on its own (with the player's "Up next" card)
            if (info?.nextItem || !isFinished(info)) return;
            setFinished(info.state?.NowPlayingItem);
        };
        Events.on(playbackManager, 'playbackstop', onStop);
        return () => Events.off(playbackManager, 'playbackstop', onStop);
    }, []);

    const clear = useCallback(() => setFinished(undefined), []);
    return [ finished, clear ] as const;
};

/** Shared full-screen frame: artwork behind, close button, keys to leave. */
const Frame: FC<{ backdropUrl?: string; onClose: () => void; label: string; children: React.ReactNode }> = ({ backdropUrl, onClose, label, children }) => {
    useOverlay(true, onClose);

    return (
        <div className='cinema-endscreen' role='dialog' aria-modal='true' aria-label={label}>
            <div className='cinema-endscreen__backdrop' style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined} />
            <button
                type='button'
                className='cinema-endscreen__close cinema-iconbtn cinema-glass cinema-focusable'
                onClick={onClose}
                aria-label={globalize.translate('ButtonClose')}
            >
                <Close />
            </button>
            <div className='cinema-endscreen__content'>{children}</div>
        </div>
    );
};

/** After an episode: the next one, ready to play. */
const ComingNext: FC<{ finished: ItemDto; next: ItemDto; onClose: () => void }> = ({ finished, next, onClose }) => {
    const { api } = useApi();
    const playRef = useRef<HTMLButtonElement>(null);
    useAmbientTint('modal', getItemColor(next));

    // Ready for the remote: Enter plays the next episode
    useEffect(() => {
        playRef.current?.focus({ preventScroll: true });
    }, []);

    const stillUrl = api ? getLandscapeUrl(api, next, 1280) ?? getBackdropUrl(api, next) : undefined;
    const backdropUrl = api ? getBackdropUrl(api, next) : undefined;
    const logoUrl = api ? getLogoUrl(api, next) : undefined;
    const label = [ getEpisodeLabel(next), next.Name ].filter(Boolean).join(' · ');

    return (
        <Frame backdropUrl={backdropUrl} onClose={onClose} label={globalize.translate('CinemaComingNext')}>
            <div className='cinema-endscreen__next'>
                <div className='cinema-endscreen__text'>
                    <p className='cinema-endscreen__eyebrow'>
                        {globalize.translate('CinemaFinishedTitle', [ getEpisodeLabel(finished), finished.Name ].filter(Boolean).join(' · '))}
                    </p>
                    <h1 className='cinema-endscreen__heading'>{globalize.translate('CinemaComingNext')}</h1>
                    {logoUrl ?
                        <img className='cinema-endscreen__logo' src={logoUrl} alt={getDisplayTitle(next)} /> :
                        <p className='cinema-endscreen__series'>{getDisplayTitle(next)}</p>}
                    <h2 className='cinema-endscreen__title'>{label}</h2>
                    <ItemMeta item={next} />
                    {next.Overview && <p className='cinema-endscreen__overview'>{next.Overview}</p>}
                    <div className='cinema-actions'>
                        <button
                            ref={playRef}
                            type='button'
                            className='cinema-btn cinema-btn--primary cinema-focusable'
                            onClick={() => {
                                onClose();
                                playItem(next, false);
                            }}
                        >
                            <PlayArrow />
                            {globalize.translate('Play')} {getEpisodeLabel(next)}
                        </button>
                        <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={onClose}>
                            {globalize.translate('CinemaNotNow')}
                        </button>
                    </div>
                </div>
                <button
                    type='button'
                    className='cinema-endscreen__still'
                    style={stillUrl ? { backgroundImage: `url("${stillUrl}")` } : undefined}
                    onClick={() => {
                        onClose();
                        playItem(next, false);
                    }}
                    tabIndex={-1}
                    aria-hidden='true'
                >
                    <span className='cinema-endscreen__stillplay'><PlayArrow /></span>
                    {Boolean(next.RunTimeTicks) && <span className='cinema-endscreen__runtime'>{formatRuntime(next.RunTimeTicks)}</span>}
                </button>
            </div>
        </Frame>
    );
};

/** After a movie (or the last episode): a featured pick and more like it. */
const AlsoWatch: FC<{ finished: ItemDto; onClose: () => void }> = ({ finished, onClose }) => {
    const { api } = useApi();
    const { data } = useAlsoWatch(finished);
    const getItemLink = useItemLink();
    const featured = data?.items[0];
    const others = data?.items.slice(1) ?? [];
    useAmbientTint('modal', getItemColor(featured));
    const playRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (featured) playRef.current?.focus({ preventScroll: true });
    }, [ featured ]);

    // Nothing at all left to suggest: nothing to show
    useEffect(() => {
        if (data && !featured) onClose();
    }, [ data, featured, onClose ]);

    if (!featured) return null;

    const finishedTitle = getDisplayTitle(finished);
    const backdropUrl = api ? getBackdropUrl(api, featured) : undefined;
    const logoUrl = api ? getLogoUrl(api, featured) : undefined;
    const isPlayable = featured.MediaType === 'Video';

    return (
        <Frame backdropUrl={backdropUrl} onClose={onClose} label={globalize.translate('CinemaAlsoWatch')}>
            <div className='cinema-endscreen__text'>
                <p className='cinema-endscreen__eyebrow'>
                    {data?.isSameGenre ?
                        globalize.translate('CinemaBecauseYouFinished', finishedTitle) :
                        globalize.translate('CinemaSomethingNew')}
                </p>
                <h1 className='cinema-endscreen__heading'>{globalize.translate('CinemaAlsoWatch')}</h1>
                {logoUrl ?
                    <img className='cinema-endscreen__logo' src={logoUrl} alt={getDisplayTitle(featured)} /> :
                    <h2 className='cinema-endscreen__title cinema-endscreen__title--big'>{getDisplayTitle(featured)}</h2>}
                <ItemMeta item={featured} />
                {featured.Overview && <p className='cinema-endscreen__overview'>{featured.Overview}</p>}
                <div className='cinema-actions'>
                    {isPlayable && (
                        <button
                            ref={playRef}
                            type='button'
                            className='cinema-btn cinema-btn--primary cinema-focusable'
                            onClick={() => {
                                onClose();
                                playItem(featured, false);
                            }}
                        >
                            <PlayArrow />
                            {globalize.translate('Play')}
                        </button>
                    )}
                    <Link {...getItemLink(featured)} className='cinema-btn cinema-glass cinema-focusable' onClick={onClose}>
                        <InfoOutlined />
                        {globalize.translate('ButtonInfo')}
                    </Link>
                </div>
            </div>

            {others.length > 0 && (
                <section className='cinema-endscreen__more' aria-label={globalize.translate('CinemaMorePicks')}>
                    <h3 className='cinema-row__title'>{globalize.translate('CinemaMorePicks')}</h3>
                    {/* Picking a card opens its details over the page, so the end screen steps aside */}
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                    <div onClick={onClose}>
                        <ScrollTrack className='cinema-row__track'>
                            {others.map((item, index) => (
                                <MediaCard
                                    key={item.Id}
                                    item={item}
                                    index={index}
                                    shape={isMostlyWide(others) ? 'landscape' : 'poster'}
                                    subtitle={item.ProductionYear?.toString()}
                                />
                            ))}
                        </ScrollTrack>
                    </div>
                </section>
            )}
        </Frame>
    );
};

/** Decides which screen to show once something has finished. */
const EndScreenContent: FC<{ finished: ItemDto; onClose: () => void }> = ({ finished, onClose }) => {
    const { data: next, isPending } = useFollowingEpisode(finished);
    // An episode without a series to look in is treated like a single title
    const isEpisode = finished.Type === 'Episode' && Boolean(finished.SeriesId);

    // Wait to learn whether there's a next episode before choosing
    if (isEpisode && isPending) return null;
    if (isEpisode && next) return <ComingNext finished={finished} next={next} onClose={onClose} />;
    return <AlsoWatch finished={finished} onClose={onClose} />;
};

/**
 * When a title finishes and nothing else is queued, the player closes onto this screen instead of
 * straight back to the page: "Coming next" with the following episode, or, after a movie or a
 * series' last episode, "You could also watch" with unwatched picks in the same genres.
 */
const EndScreen: FC = () => {
    const [ finished, clear ] = useFinishedItem();
    const { pathname } = useLocation();
    // Shown once the player has closed, over whatever page it returns to
    const isPlayerOpen = pathname === '/video';

    // Leaving for another page (e.g. opening a title's full page) closes it
    const shownOnRef = useRef<string>();
    useEffect(() => {
        if (!finished || isPlayerOpen) return;
        if (!shownOnRef.current) shownOnRef.current = pathname;
        else if (shownOnRef.current !== pathname) clear();
    }, [ clear, finished, isPlayerOpen, pathname ]);

    useEffect(() => {
        if (!finished) shownOnRef.current = undefined;
    }, [ finished ]);

    if (!finished || isPlayerOpen) return null;
    return <EndScreenContent key={finished.Id} finished={finished} onClose={clear} />;
};

export default EndScreen;
