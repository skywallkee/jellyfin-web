import Close from '@mui/icons-material/Close';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Theaters from '@mui/icons-material/Theaters';
import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useAmbientTint } from '../utils/ambient';
import { getItemColor } from '../utils/blurhash';
import { canPlayClip, prefersReducedMotion } from '../utils/clip';
import { getBackdropUrl, getLandscapeUrl, getLogoUrl } from '../utils/images';
import { formatRuntime, getDisplayTitle, getRemainingTicks } from '../utils/items';
import { useItemLink } from '../hooks/useItemLink';
import { useOverlay } from '../hooks/useOverlay';
import { playItem } from '../utils/actions';

import BackgroundClip from './BackgroundClip';
import { FavoriteButton } from './ItemActions';
import ItemMeta from './ItemMeta';

/** How long each featured title stays up before the hero moves to the next one. */
const ROTATE_INTERVAL_MS = 9000;
/** How long the artwork shows before a clip of the title starts playing behind it. */
const CLIP_DELAY_MS = 3500;

interface HeroBannerProps {
    items: ItemDto[];
    /** A shorter spotlight, e.g. at the top of a library page. */
    isCompact?: boolean;
}

interface BackdropLayer {
    key: string;
    url?: string;
}

/**
 * Keeps the previous backdrop under the new one while it fades in, for a true crossfade
 * instead of fading up from black.
 */
const useBackdropLayers = (key: string | undefined, url: string | undefined) => {
    const [ layers, setLayers ] = useState<BackdropLayer[]>([]);
    useEffect(() => {
        if (!key) return;
        setLayers(previous => [
            ...previous.filter(layer => layer.key !== key).slice(-1),
            { key, url }
        ]);
    }, [ key, url ]);
    return layers;
};

/**
 * Moves the artwork slower than the page while scrolling and fades the text out,
 * through CSS variables set straight on the element (no re-renders while scrolling).
 */
const useScrollParallax = (ref: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const element = ref.current;
            if (!element) return;
            const height = element.offsetHeight || 1;
            const progress = Math.min(1, Math.max(0, window.scrollY / height));
            element.style.setProperty('--cinema-parallax', progress.toFixed(3));
        };
        const onScroll = () => {
            frame ||= window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.cancelAnimationFrame(frame);
        };
    }, [ ref ]);
};

let canFollowPointer: boolean | undefined;

/**
 * Layers of the hero drift against the pointer for a sense of depth (Apple TV style):
 * artwork moves one way, text the other. Set through CSS variables, outside React renders.
 */
const usePointerDepth = (ref: React.RefObject<HTMLElement>) => {
    const frame = useRef(0);
    return useCallback((e: React.MouseEvent) => {
        canFollowPointer ??= Boolean(window.matchMedia?.('(pointer: fine)').matches) && !prefersReducedMotion();
        if (!canFollowPointer) return;
        const { clientX, clientY } = e;
        window.cancelAnimationFrame(frame.current);
        frame.current = window.requestAnimationFrame(() => {
            const element = ref.current;
            if (!element) return;
            const rect = element.getBoundingClientRect();
            element.style.setProperty('--cinema-mx', (((clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
            element.style.setProperty('--cinema-my', (((clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
        });
    }, [ ref ]);
};

interface Letter {
    char: string;
    /** Position in the whole title: a stable key (the text never changes) and the stagger order. */
    order: number;
}

/** Splits a title into words of letters, numbering the letters across the whole title. */
const splitTitle = (text: string) => {
    let order = 0;
    return text.split(' ').map(word => {
        const letters: Letter[] = [ ...word ].map(char => ({ char, order: order++ }));
        return { key: letters[0]?.order ?? order, letters };
    });
};

/** The title written out letter by letter, each easing in just after the one before. */
const RevealTitle: FC<{ text: string }> = ({ text }) => (
    <h1 className='cinema-hero__title cinema-reveal' aria-label={text}>
        {splitTitle(text).map((word, w) => (
            <React.Fragment key={word.key}>
                {w > 0 && ' '}
                {/* Words stay whole, so the title only wraps between them */}
                <span className='cinema-reveal__word' aria-hidden='true'>
                    {word.letters.map(letter => (
                        <span key={letter.order} style={{ '--cinema-i': letter.order } as React.CSSProperties}>{letter.char}</span>
                    ))}
                </span>
            </React.Fragment>
        ))}
    </h1>
);

/** Full-screen viewing of the hero clip: Esc or Back leaves, and the page can't scroll meanwhile. */
const useTheater = (isTheater: boolean, exit: () => void) => {
    useEffect(() => {
        if (!isTheater) return;
        window.scrollTo({ top: 0 });
        const root = document.documentElement;
        root.classList.add('cinema-theater');
        return () => root.classList.remove('cinema-theater');
    }, [ isTheater ]);
    // Escape / Back leave (when it's the top overlay; Backspace in a text field still deletes)
    useOverlay(isTheater, exit);
};

const HeroBanner: FC<HeroBannerProps> = ({ items, isCompact }) => {
    const { api } = useApi();
    const [ index, setIndex ] = useState(0);
    const [ isPaused, setIsPaused ] = useState(false);
    // A playing clip holds the hero on its title until the clip finishes
    const [ isClipPlaying, setIsClipPlaying ] = useState(false);
    const [ isTheater, setIsTheater ] = useState(false);
    const exitTheater = useCallback(() => setIsTheater(false), []);
    useTheater(isTheater, exitTheater);
    // Bumped when rotation resumes, so the countdown on the active dot restarts with the timer
    const [ cycle, setCycle ] = useState(0);
    const heroRef = useRef<HTMLElement>(null);
    const getItemLink = useItemLink();

    const count = items.length;
    const item = items[Math.min(index, count - 1)];

    // Rotate through featured titles, but hold still while the user is interacting with the hero
    useEffect(() => {
        if (count < 2 || isPaused || isClipPlaying || isTheater) return;
        const timer = window.setTimeout(() => setIndex(i => (i + 1) % count), ROTATE_INTERVAL_MS);
        return () => window.clearTimeout(timer);
    }, [ count, isPaused, isClipPlaying, isTheater, index, cycle ]);

    // When a clip ends, restart the countdown so the next title still gets its full time
    useEffect(() => {
        if (!isClipPlaying) setCycle(c => c + 1);
    }, [ isClipPlaying ]);

    useScrollParallax(heroRef);
    const onPointerDepth = usePointerDepth(heroRef);

    const pause = useCallback(() => setIsPaused(true), []);
    const resume = useCallback((e: React.FocusEvent | React.MouseEvent) => {
        if ('relatedTarget' in e && e.relatedTarget instanceof Node && heroRef.current?.contains(e.relatedTarget)) return;
        setIsPaused(false);
        setCycle(c => c + 1);
    }, []);

    const backdropUrl = api && item ? getBackdropUrl(api, item) : undefined;
    const layers = useBackdropLayers(item?.Id ?? undefined, backdropUrl);

    // Load the next title's artwork in the background, so the crossfade never waits on the network
    const nextItem = count > 1 ? items[(index + 1) % count] : undefined;
    const nextBackdropUrl = api && nextItem ? getBackdropUrl(api, nextItem) : undefined;
    useEffect(() => {
        if (!nextBackdropUrl) return;
        const timer = window.setTimeout(() => {
            const image = new Image();
            image.decoding = 'async';
            image.src = nextBackdropUrl;
        }, ROTATE_INTERVAL_MS / 2);
        return () => window.clearTimeout(timer);
    }, [ nextBackdropUrl ]);
    useAmbientTint('hero', getItemColor(item));

    if (!item || !api) return null;

    const logoUrl = getLogoUrl(api, item);
    const title = getDisplayTitle(item);
    const remainingTicks = getRemainingTicks(item);
    const isResumable = Boolean(remainingTicks && item.UserData?.PlaybackPositionTicks);
    const playLabel = isResumable ?
        `${globalize.translate('ButtonResume')} · ${formatRuntime(remainingTicks)}` :
        globalize.translate('Play');

    return (
        <section
            ref={heroRef}
            className={classNames('cinema-hero', { 'has-clip': isClipPlaying, 'is-theater': isTheater, 'cinema-hero--compact': isCompact })}
            aria-roledescription='carousel'
            aria-label={title}
            onMouseEnter={pause}
            onMouseLeave={resume}
            onFocus={pause}
            onBlur={resume}
            onMouseMove={onPointerDepth}
            style={{ '--cinema-rotate-ms': `${ROTATE_INTERVAL_MS}ms` } as React.CSSProperties}
        >
            {layers.map(layer => (
                <div
                    key={layer.key}
                    className='cinema-hero__backdrop'
                    style={layer.url ? { backgroundImage: `url("${layer.url}")` } : undefined}
                />
            ))}

            <BackgroundClip
                key={`${item.Id}-clip`}
                item={item}
                delayMs={CLIP_DELAY_MS}
                className='cinema-hero__clip'
                onPlayingChange={setIsClipPlaying}
                isTheater={isTheater}
                onEnded={exitTheater}
            />

            {isTheater && (
                <>
                    {/* Black bars slide in, as when the lights go down */}
                    <div className='cinema-letterbox' aria-hidden='true' />
                    <button
                        type='button'
                        className='cinema-theater-exit cinema-iconbtn cinema-glass cinema-focusable'
                        onClick={exitTheater}
                        aria-label={globalize.translate('CinemaExitPreview')}
                        title={globalize.translate('CinemaExitPreview')}
                    >
                        <Close />
                    </button>
                </>
            )}

            {/* Keyed by item so the text eases in again each time the featured title changes */}
            <div key={`${item.Id}-body`} className='cinema-hero__body'>
                {logoUrl ?
                    // A band of light sweeps across the logo, masked to its shape
                    <span className='cinema-hero__logo-wrap' style={{ '--cinema-logo': `url("${logoUrl}")` } as React.CSSProperties}>
                        <img className='cinema-hero__logo' src={logoUrl} alt={title} />
                    </span> :
                    <RevealTitle text={title} />}

                <ItemMeta item={item} />

                {item.Overview && <p className='cinema-hero__overview'>{item.Overview}</p>}

                <div className='cinema-actions'>
                    <button
                        type='button'
                        className='cinema-btn cinema-btn--primary cinema-focusable'
                        onClick={() => playItem(item, isResumable)}
                    >
                        <PlayArrow />
                        {playLabel}
                    </button>
                    <Link
                        {...getItemLink(item)}
                        className='cinema-btn cinema-glass cinema-focusable'
                    >
                        <InfoOutlined />
                        {globalize.translate('ButtonInfo')}
                    </Link>
                    {canPlayClip(item) && (
                        <button
                            type='button'
                            className='cinema-btn cinema-glass cinema-focusable'
                            onClick={() => setIsTheater(true)}
                        >
                            <Theaters />
                            {globalize.translate('CinemaPreview')}
                        </button>
                    )}
                    <FavoriteButton item={item} />
                </div>

                {count > 1 && (
                    <div className={isPaused || isClipPlaying ? 'cinema-pager is-paused' : 'cinema-pager'}>
                        {items.map((featured, i) => (
                            <button
                                key={featured.Id}
                                type='button'
                                tabIndex={-1}
                                className={i === index ? 'is-active' : undefined}
                                // Shown when the dots open up into thumbnails on hover
                                style={{ '--cinema-thumb': `url("${getLandscapeUrl(api, featured, 240) ?? ''}")` } as React.CSSProperties}
                                aria-label={getDisplayTitle(featured)}
                                aria-current={i === index}
                                onClick={() => setIndex(i)}
                            >
                                {/* Fills up while the current title is on screen */}
                                {i === index && <span key={`${index}-${cycle}`} className='cinema-pager__fill' />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default HeroBanner;
