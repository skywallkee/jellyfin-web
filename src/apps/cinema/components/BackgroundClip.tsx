import VolumeOff from '@mui/icons-material/VolumeOff';
import VolumeUp from '@mui/icons-material/VolumeUp';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { canPlayClip, getClipUrl, prefersReducedMotion, useClipTurn, useIsOnScreen } from '../utils/clip';
import { useCinemaSettings } from '../utils/settings';

/** How long a clip plays before fading back to the artwork. */
const MAX_PLAY_MS = 45_000;

// Unmuting is remembered for the rest of the visit, so the next clip keeps its sound
let isMutedPreference = true;

interface BackgroundClipProps {
    item: ItemDto;
    /** How long the artwork shows before the clip starts. */
    delayMs: number;
    className?: string;
    /** Told when the clip starts and stops showing, e.g. to hold a carousel still meanwhile. */
    onPlayingChange?: (isPlaying: boolean) => void;
    /** Full-screen "theater" viewing: starts at once, with sound, and plays to the end. */
    isTheater?: boolean;
    /** Told when the clip finishes. */
    onEnded?: () => void;
}

/**
 * A muted clip of the title that fades in over its artwork after a moment, Netflix-style,
 * with a button to turn the sound on. Off when video previews are disabled or motion is reduced.
 */
const BackgroundClip: FC<BackgroundClipProps> = ({ item, delayMs, className, onPlayingChange, isTheater, onEnded }) => {
    const { api } = useApi();
    const [ settings ] = useCinemaSettings();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ isStarted, setIsStarted ] = useState(false);
    const [ isPlaying, setIsPlaying ] = useState(false);
    const [ isMuted, setIsMuted ] = useState(isMutedPreference);
    // Set once the clip has had its time; it then stays paused (unless watched full screen)
    const [ isExpired, setIsExpired ] = useState(false);
    // Asking for theater mode is an explicit choice, so it plays even with previews turned off
    const isEnabled = canPlayClip(item) && (isTheater || (settings.videoPreviews && !prefersReducedMotion()));
    const wrapperRef = useRef<HTMLDivElement>(null);
    // Decoding video is heavy: only play while it's this clip's turn and it's actually on screen
    const isTurn = useClipTurn(isEnabled && isStarted);
    const isOnScreen = useIsOnScreen(wrapperRef, isEnabled && isStarted);
    const shouldRun = isTurn && (isOnScreen || Boolean(isTheater)) && (!isExpired || Boolean(isTheater));

    useEffect(() => {
        if (!isEnabled) return;
        const timer = window.setTimeout(() => setIsStarted(true), isTheater ? 0 : delayMs);
        return () => window.clearTimeout(timer);
    }, [ delayMs, isEnabled, isTheater ]);

    // Fade back to the artwork after a while, like a trailer ending (but not when watching full screen)
    useEffect(() => {
        if (!isPlaying || isTheater) return;
        const timer = window.setTimeout(() => setIsExpired(true), MAX_PLAY_MS);
        return () => window.clearTimeout(timer);
    }, [ isPlaying, isTheater ]);

    // Kept in a ref so the latest callback is used without restarting effects
    const onPlayingChangeRef = useRef(onPlayingChange);
    onPlayingChangeRef.current = onPlayingChange;
    useEffect(() => {
        onPlayingChangeRef.current?.(isPlaying);
    }, [ isPlaying ]);

    useEffect(() => () => onPlayingChangeRef.current?.(false), []);

    // Stop downloading as soon as the clip goes away. The element is captured when it appears,
    // since React has already cleared the ref by the time an unmount cleanup runs.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        return () => {
            video.pause();
            video.removeAttribute('src');
            video.load();
        };
    }, [ isStarted ]);

    // Play only while allowed; otherwise pause and fade back to the artwork until it may run again.
    // Also pause while the tab is hidden, so sound doesn't keep playing from a background tab.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const sync = () => {
            if (shouldRun && !document.hidden) {
                video.play().catch(() => setIsPlaying(false));
            } else {
                video.pause();
                setIsPlaying(false);
            }
        };
        sync();
        document.addEventListener('visibilitychange', sync);
        return () => document.removeEventListener('visibilitychange', sync);
    }, [ shouldRun, isStarted ]);

    if (!api || !isEnabled || !isStarted) return null;

    const toggleMute = () => {
        isMutedPreference = !isMuted;
        setIsMuted(isMutedPreference);
    };

    return (
        <>
            {/* The wrapper carries the same dark gradient as the artwork, so text stays readable */}
            <div ref={wrapperRef} className={classNames('cinema-clip', className, { 'is-playing': isPlaying })} aria-hidden='true'>
                {/* A short ambient preview; captions belong to the real player */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    ref={videoRef}
                    src={getClipUrl(api, item)}
                    muted={isTheater ? false : isMuted}
                    playsInline
                    preload='auto'
                    onPlaying={() => setIsPlaying(true)}
                    onEnded={() => {
                        setIsPlaying(false);
                        onEnded?.();
                    }}
                    onError={() => setIsPlaying(false)}
                />
            </div>
            <button
                type='button'
                className={classNames('cinema-clip__mute cinema-iconbtn cinema-glass cinema-focusable', { 'is-visible': isPlaying && !isTheater })}
                onClick={toggleMute}
                aria-label={globalize.translate(isMuted ? 'Unmute' : 'Mute')}
                aria-pressed={!isMuted}
                tabIndex={isPlaying ? 0 : -1}
            >
                {isMuted ? <VolumeOff fontSize='small' /> : <VolumeUp fontSize='small' />}
            </button>
        </>
    );
};

export default BackgroundClip;
