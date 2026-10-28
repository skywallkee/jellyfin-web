import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import React, {
    type FC,
    type PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { Link, useLocation } from 'react-router-dom';

import layoutManager from 'components/layoutManager';
import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { playItem } from '../utils/actions';
import { useItemLink } from '../hooks/useItemLink';
import { getBackdropUrl, getLandscapeUrl } from '../utils/images';
import { getDisplayTitle, getRemainingTicks } from '../utils/items';
import { useCinemaSettings } from '../utils/settings';

import { FavoriteButton, PlayedButton } from './ItemActions';
import ItemMeta from './ItemMeta';

/** How long the pointer rests on a card before the preview opens. */
const OPEN_DELAY_MS = 650;
/** Grace period to move the pointer from the card onto the preview. */
const CLOSE_DELAY_MS = 180;
/** How long the preview shows artwork before starting the video clip. */
const VIDEO_DELAY_MS = 900;
/** Where in the title the clip starts, as a fraction of its runtime. */
const VIDEO_START_FRACTION = 0.2;
const TICKS_PER_SECOND = 10_000_000;

const PREVIEW_MIN_WIDTH = 340;
const PREVIEW_MAX_WIDTH = 480;
const PREVIEW_SCALE = 1.55;
/** Rough height of the text and buttons under the media, used to keep the preview on screen. */
const PREVIEW_BODY_HEIGHT = 190;
const VIEWPORT_MARGIN = 16;

interface PreviewTarget {
    item: ItemDto;
    rect: DOMRect;
}

interface PreviewContextValue {
    /** Call when the pointer enters a card. */
    onCardEnter: (item: ItemDto, element: HTMLElement) => void;
    /** Call when the pointer leaves a card. */
    onCardLeave: () => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

/** Hover handlers for a card, or nothing when previews aren't available (e.g. on TV). */
export const useHoverPreview = () => useContext(PreviewContext);

const supportsHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

const getPosition = (rect: DOMRect) => {
    const width = Math.min(PREVIEW_MAX_WIDTH, Math.max(PREVIEW_MIN_WIDTH, rect.width * PREVIEW_SCALE));
    const mediaHeight = width * 9 / 16;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;
    const maxTop = window.innerHeight - VIEWPORT_MARGIN - mediaHeight - PREVIEW_BODY_HEIGHT;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(maxLeft, rect.left + rect.width / 2 - width / 2));
    const top = Math.max(VIEWPORT_MARGIN, Math.min(maxTop, rect.top + rect.height / 2 - mediaHeight / 2 - 24));
    return { left, top, width };
};

/** A muted clip of the title, started part-way in; stays hidden until it actually plays. */
const PreviewVideo: FC<{ item: ItemDto }> = ({ item }) => {
    const { api } = useApi();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ isStarted, setIsStarted ] = useState(false);
    const [ isPlaying, setIsPlaying ] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsStarted(true), VIDEO_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    // Stop downloading as soon as the preview closes
    useEffect(() => () => {
        const video = videoRef.current;
        if (video) {
            video.removeAttribute('src');
            video.load();
        }
    }, []);

    if (!api || !item.Id || !isStarted) return null;

    const startSeconds = Math.floor(((item.RunTimeTicks ?? 0) / TICKS_PER_SECOND) * VIDEO_START_FRACTION);
    // Direct stream of the original file; if the browser can't play it, the artwork simply stays up
    const src = `${api.basePath}/Videos/${item.Id}/stream?static=true&api_key=${api.accessToken}#t=${startSeconds}`;

    return (
        <video
            ref={videoRef}
            className={isPlaying ? 'cinema-preview__video is-playing' : 'cinema-preview__video'}
            src={src}
            muted
            autoPlay
            playsInline
            loop
            preload='auto'
            onPlaying={() => setIsPlaying(true)}
            onError={() => setIsPlaying(false)}
        />
    );
};

interface PreviewPanelProps {
    target: PreviewTarget;
    onEnter: () => void;
    onLeave: () => void;
}

const PreviewPanel: FC<PreviewPanelProps> = ({ target, onEnter, onLeave }) => {
    const { api } = useApi();
    const [ settings ] = useCinemaSettings();
    // The card may come from a list without a description, so load the full item
    const { data: fullItem } = useItem(target.item.Id ?? undefined);
    const item = fullItem ?? target.item;
    const itemLink = useItemLink()(item);
    const { left, top, width } = getPosition(target.rect);
    const imageUrl = api ? getBackdropUrl(api, item, 960) ?? getLandscapeUrl(api, item, 960) : undefined;
    const title = getDisplayTitle(item);
    const isVideo = item.MediaType === 'Video';
    const isResumable = Boolean(getRemainingTicks(item) && !item.UserData?.Played);
    const canPlayClip = isVideo && settings.videoPreviews
        && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    return (
        <div
            className='cinema-preview cinema-glass'
            style={{ left, top, width }}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            role='dialog'
            aria-label={title}
        >
            <Link
                {...itemLink}
                className='cinema-preview__media'
                style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
                tabIndex={-1}
            >
                {canPlayClip && <PreviewVideo item={item} />}
            </Link>
            <div className='cinema-preview__body'>
                {/* The episode number is already in the info line below */}
                <div className='cinema-preview__title'>{title}</div>
                {item.Type === 'Episode' && item.Name && (
                    <div className='cinema-preview__subtitle'>{item.Name}</div>
                )}
                <ItemMeta item={item} />
                {item.Overview && <p className='cinema-preview__overview'>{item.Overview}</p>}
                <div className='cinema-preview__actions'>
                    {(isVideo || item.Type === 'Series' || item.Type === 'Season') && (
                        <button
                            type='button'
                            className='cinema-btn cinema-btn--primary cinema-btn--round'
                            onClick={() => playItem(item, isResumable)}
                            aria-label={globalize.translate(isResumable ? 'ButtonResume' : 'Play')}
                            title={globalize.translate(isResumable ? 'ButtonResume' : 'Play')}
                        >
                            <PlayArrow />
                        </button>
                    )}
                    <PlayedButton item={item} />
                    <FavoriteButton item={item} />
                    <Link
                        {...itemLink}
                        className='cinema-btn cinema-btn--round cinema-glass cinema-preview__info'
                        aria-label={globalize.translate('ButtonInfo')}
                        title={globalize.translate('ButtonInfo')}
                    >
                        <InfoOutlined />
                    </Link>
                </div>
            </div>
        </div>
    );
};

/** Provides hover previews for cards inside it, and draws the open preview. */
export const HoverPreviewProvider: FC<PropsWithChildren> = ({ children }) => {
    const [ target, setTarget ] = useState<PreviewTarget | null>(null);
    const openTimer = useRef<number>();
    const closeTimer = useRef<number>();
    const isEnabled = !layoutManager.cinemaTv && supportsHover();

    const clearTimers = () => {
        window.clearTimeout(openTimer.current);
        window.clearTimeout(closeTimer.current);
    };

    const close = useCallback(() => {
        clearTimers();
        setTarget(null);
    }, []);

    const scheduleClose = useCallback(() => {
        window.clearTimeout(openTimer.current);
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setTarget(null), CLOSE_DELAY_MS);
    }, []);

    const cancelClose = useCallback(() => window.clearTimeout(closeTimer.current), []);

    const onCardEnter = useCallback((item: ItemDto, element: HTMLElement) => {
        clearTimers();
        openTimer.current = window.setTimeout(() => {
            setTarget({ item, rect: element.getBoundingClientRect() });
        }, OPEN_DELAY_MS);
    }, []);

    // The preview is positioned for where the card was, so close it once anything scrolls
    useEffect(() => {
        if (!target) return;
        window.addEventListener('scroll', close, { capture: true, passive: true });
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, { capture: true });
            window.removeEventListener('resize', close);
        };
    }, [ close, target ]);

    useEffect(() => clearTimers, []);

    // Close when navigating, e.g. after pressing Info in the preview
    const location = useLocation();
    useEffect(close, [ close, location.pathname, location.search ]);

    const value = useMemo(() => (
        isEnabled ? { onCardEnter, onCardLeave: scheduleClose } : null
    ), [ isEnabled, onCardEnter, scheduleClose ]);

    return (
        <PreviewContext.Provider value={value}>
            {children}
            {target && (
                <PreviewPanel
                    key={target.item.Id}
                    target={target}
                    onEnter={cancelClose}
                    onLeave={scheduleClose}
                />
            )}
        </PreviewContext.Provider>
    );
};
