import React, { type FC, useEffect, useRef } from 'react';

const ORIGIN = 'https://www.youtube-nocookie.com';
const PLAYING = 1;
const ENDED = 0;

interface YouTubeFrameProps {
    videoId: string;
    /** Play while true, pause while false. */
    shouldRun: boolean;
    isMuted: boolean;
    onPlayingChange: (isPlaying: boolean) => void;
    onEnded?: () => void;
}

/**
 * A YouTube trailer without YouTube's own controls, steered like the other clips:
 * play/pause and mute are sent to the embedded player, and it reports back when it's
 * playing or has ended. Uses the privacy-enhanced (no-cookie) player.
 */
const YouTubeFrame: FC<YouTubeFrameProps> = ({ videoId, shouldRun, isMuted, onPlayingChange, onEnded }) => {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const callbacks = useRef({ onPlayingChange, onEnded });
    callbacks.current = { onPlayingChange, onEnded };

    const send = (func: string, args: unknown[] = []) => {
        frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), ORIGIN);
    };

    // Ask the player to report its state, and listen for it
    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== ORIGIN || (e.source as Window | null) !== frameRef.current?.contentWindow) return;
            let data: { event?: string; info?: unknown };
            try {
                data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            } catch {
                return;
            }
            const state = data.event === 'onStateChange' ? data.info : (data.info as { playerState?: number } | undefined)?.playerState;
            if (state === PLAYING) {
                callbacks.current.onPlayingChange(true);
            } else if (state === ENDED) {
                callbacks.current.onPlayingChange(false);
                callbacks.current.onEnded?.();
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const onLoad = () => {
        frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: videoId, channel: 'widget' }), ORIGIN);
        send('addEventListener', [ 'onStateChange' ]);
        send(isMuted ? 'mute' : 'unMute');
        send(shouldRun ? 'playVideo' : 'pauseVideo');
    };

    useEffect(() => {
        send(shouldRun ? 'playVideo' : 'pauseVideo');
        if (!shouldRun) callbacks.current.onPlayingChange(false);
    }, [ shouldRun ]);

    useEffect(() => {
        send(isMuted ? 'mute' : 'unMute');
    }, [ isMuted ]);

    // Autoplay muted with no controls, keyboard, annotations or related videos; the API lets us steer it
    const params = new URLSearchParams([
        [ 'autoplay', '1' ],
        [ 'mute', '1' ],
        [ 'controls', '0' ],
        [ 'disablekb', '1' ],
        [ 'enablejsapi', '1' ],
        [ 'iv_load_policy', '3' ],
        [ 'modestbranding', '1' ],
        [ 'playsinline', '1' ],
        [ 'rel', '0' ],
        [ 'origin', window.location.origin ]
    ]);

    return (
        <iframe
            ref={frameRef}
            className='cinema-clip__youtube'
            src={`${ORIGIN}/embed/${videoId}?${params.toString()}`}
            title='Trailer'
            allow='autoplay; encrypted-media; picture-in-picture'
            tabIndex={-1}
            onLoad={onLoad}
        />
    );
};

export default YouTubeFrame;
