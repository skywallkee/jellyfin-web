import BedtimeOutlined from '@mui/icons-material/BedtimeOutlined';
import Check from '@mui/icons-material/Check';
import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { playbackManager } from 'components/playback/playbackmanager';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useOverlay } from '../../hooks/useOverlay';
import { getDisplayTitle } from '../../utils/items';
import { playSound } from '../../utils/sounds';

/** Minutes until the player pauses, or "when this episode / film ends". */
export type SleepChoice = number | 'end';

const SLEEP_MINUTES = [ 15, 30, 45, 60, 90 ];
/** The sound fades out over the last part, rather than stopping dead. */
const FADE_MS = 20_000;
const TICK_MS = 1000;

/** How many episodes may start by themselves before asking if anyone is still there. */
export const EPISODES_BEFORE_CHECK = 3;
const ACTIVITY_EVENTS = [ 'pointerdown', 'keydown', 'wheel', 'touchstart' ] as const;

interface SleepState {
    choice?: SleepChoice;
    endsAt?: number;
    /** For "end of this one": the item that's playing when it was set. */
    itemId?: string;
}

/** Pauses, then puts the volume back for next time. */
const pauseGently = (volumeBefore?: number) => {
    playbackManager.pause();
    if (volumeBefore != null) window.setTimeout(() => playbackManager.setVolume(volumeBefore), 400);
};

/**
 * A sleep timer: after a number of minutes, or when the current title ends, the sound fades and
 * playback pauses. Reports what's left so the button can show it.
 */
export const useSleepTimer = (item?: ItemDto) => {
    const [ state, setState ] = useState<SleepState>({});
    const [ remainingMs, setRemainingMs ] = useState<number>();
    const [ hasSlept, setHasSlept ] = useState(false);
    const volumeRef = useRef<number>();

    const set = useCallback((choice?: SleepChoice) => {
        if (volumeRef.current != null) playbackManager.setVolume(volumeRef.current);
        volumeRef.current = undefined;
        setHasSlept(false);
        if (choice == null) {
            setState({});
            setRemainingMs(undefined);
        } else if (choice === 'end') {
            setState({ choice, itemId: item?.Id ?? undefined });
        } else {
            setState({ choice, endsAt: Date.now() + choice * 60_000 });
        }
    }, [ item?.Id ]);

    const fallAsleep = useCallback(() => {
        pauseGently(volumeRef.current);
        volumeRef.current = undefined;
        setState({});
        setRemainingMs(undefined);
        setHasSlept(true);
    }, []);

    // Counting down, fading the sound near the end
    useEffect(() => {
        const { endsAt } = state;
        if (!endsAt) return;
        const tick = () => {
            const left = endsAt - Date.now();
            setRemainingMs(Math.max(0, left));
            if (left <= 0) {
                fallAsleep();
            } else if (left < FADE_MS) {
                volumeRef.current ??= playbackManager.getVolume();
                playbackManager.setVolume(Math.round((volumeRef.current ?? 100) * left / FADE_MS));
            }
        };
        tick();
        const timer = window.setInterval(tick, TICK_MS);
        return () => window.clearInterval(timer);
    }, [ fallAsleep, state ]);

    // "End of this one": once something else starts, pause it straight away
    useEffect(() => {
        if (state.choice === 'end' && item?.Id && state.itemId && item.Id !== state.itemId) fallAsleep();
    }, [ fallAsleep, item?.Id, state ]);

    // Leaving the player puts the volume back if it was fading
    useEffect(() => () => {
        if (volumeRef.current != null) playbackManager.setVolume(volumeRef.current);
    }, []);

    const dismissSlept = useCallback(() => setHasSlept(false), []);

    return { choice: state.choice, remainingMs, hasSlept, dismissSlept, set };
};

const formatLeft = (ms?: number) => {
    if (ms == null) return undefined;
    const minutes = Math.ceil(ms / 60_000);
    return minutes > 1 ? globalize.translate('CinemaMinutesShort', minutes) : `${Math.ceil(ms / 1000)}s`;
};

interface SleepButtonProps {
    timer: ReturnType<typeof useSleepTimer>;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
}

/** The moon button: shows the time left while set, and a small menu of choices. */
export const SleepButton: FC<SleepButtonProps> = ({ timer, isOpen, onToggle, onClose }) => {
    const label = timer.choice === 'end' ? globalize.translate('CinemaSleepEndShort') : formatLeft(timer.remainingMs);
    const options: { choice?: SleepChoice; label: string }[] = [
        { choice: undefined, label: globalize.translate('Off') },
        ...SLEEP_MINUTES.map(minutes => ({ choice: minutes, label: globalize.translate('CinemaMinutesLong', minutes) })),
        { choice: 'end', label: globalize.translate('CinemaSleepEnd') }
    ];

    return (
        <div className='cinema-pextras__sleep'>
            <button
                type='button'
                className={classNames('cinema-pextras__btn cinema-focusable', { 'is-active': isOpen, 'is-set': timer.choice != null })}
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-label={globalize.translate('CinemaSleepTimer')}
                title={globalize.translate('CinemaSleepTimer')}
            >
                <BedtimeOutlined />
                {label && <span>{label}</span>}
            </button>
            {isOpen && (
                <div className='cinema-pextras__menu cinema-glass' role='menu' aria-label={globalize.translate('CinemaSleepTimer')}>
                    <p className='cinema-endscreen__heading'>{globalize.translate('CinemaSleepTimer')}</p>
                    {options.map(option => {
                        const isCurrent = option.choice === timer.choice;
                        return (
                            <button
                                key={option.label}
                                type='button'
                                role='menuitemradio'
                                aria-checked={isCurrent}
                                className={classNames('cinema-pextras__menuitem cinema-focusable', { 'is-current': isCurrent })}
                                onClick={() => {
                                    playSound('select');
                                    timer.set(option.choice);
                                    onClose();
                                }}
                            >
                                {option.label}
                                {isCurrent && <Check />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/** After the sleep timer paused playback: a quiet note, gone after a while or on a tap. */
export const SleptNote: FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    useEffect(() => {
        const timer = window.setTimeout(onDismiss, 8000);
        return () => window.clearTimeout(timer);
    }, [ onDismiss ]);
    return (
        <button type='button' className='cinema-ptoast cinema-glass' onClick={onDismiss}>
            <BedtimeOutlined />
            {globalize.translate('CinemaSleptNote')}
        </button>
    );
};

/**
 * Counts episodes that started by themselves, one after another, with nobody touching anything.
 * After a few, playback pauses and asks whether anyone is still watching (so a series doesn't
 * play all night to an empty room).
 */
export const useStillWatching = (item?: ItemDto) => {
    const [ isAsking, setIsAsking ] = useState(false);
    const countRef = useRef(0);
    const lastIdRef = useRef<string>();

    useEffect(() => {
        const onActivity = () => {
            countRef.current = 0;
        };
        for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { capture: true, passive: true });
        return () => {
            for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, { capture: true });
        };
    }, []);

    useEffect(() => {
        const id = item?.Id ?? undefined;
        if (!id || id === lastIdRef.current) return;
        const isFollowOn = lastIdRef.current != null;
        lastIdRef.current = id;
        if (!isFollowOn || item?.Type !== 'Episode') return;
        countRef.current += 1;
        if (countRef.current >= EPISODES_BEFORE_CHECK) {
            countRef.current = 0;
            playbackManager.pause();
            setIsAsking(true);
        }
    }, [ item ]);

    const keepWatching = useCallback(() => {
        setIsAsking(false);
        playbackManager.unpause();
    }, []);

    const stop = useCallback(() => {
        setIsAsking(false);
        playbackManager.stop();
    }, []);

    return { isAsking, keepWatching, stop };
};

interface StillWatchingProps {
    item: ItemDto;
    onContinue: () => void;
    onStop: () => void;
}

/** "Still watching?" over the paused episode. */
export const StillWatching: FC<StillWatchingProps> = ({ item, onContinue, onStop }) => {
    const continueRef = useRef<HTMLButtonElement>(null);
    useOverlay(true, onContinue);
    useEffect(() => {
        continueRef.current?.focus({ preventScroll: true });
    }, []);

    return (
        <div className='cinema-still' role='alertdialog' aria-modal='true' aria-labelledby='cinema-still-title'>
            <div className='cinema-still__box'>
                <p className='cinema-endscreen__heading'>{getDisplayTitle(item)}</p>
                <h2 id='cinema-still-title' className='cinema-still__title'>{globalize.translate('CinemaStillWatching')}</h2>
                <p className='cinema-still__text'>{globalize.translate('CinemaStillWatchingText')}</p>
                <div className='cinema-actions'>
                    <button ref={continueRef} type='button' className='cinema-btn cinema-btn--primary cinema-focusable' onClick={onContinue}>
                        {globalize.translate('CinemaKeepWatching')}
                    </button>
                    <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={onStop}>
                        {globalize.translate('CinemaStopWatching')}
                    </button>
                </div>
            </div>
        </div>
    );
};
