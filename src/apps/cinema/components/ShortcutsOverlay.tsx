import React, { type FC, useEffect, useState } from 'react';

import globalize from 'lib/globalize';

import { useOverlay } from '../hooks/useOverlay';

import { SCREENSAVER_EVENT } from './Screensaver';
import { SURPRISE_EVENT } from './SurpriseMe';

interface Shortcut {
    keys: string[];
    labelKey: string;
}

const SHORTCUTS: Shortcut[] = [
    { keys: [ 'Ctrl', 'K' ], labelKey: 'CinemaShortcutSearch' },
    { keys: [ '/' ], labelKey: 'CinemaShortcutSearch' },
    { keys: [ 'R' ], labelKey: 'CinemaSurpriseMe' },
    { keys: [ 'Z' ], labelKey: 'LabelScreensaver' },
    { keys: [ '←', '↑', '→', '↓' ], labelKey: 'CinemaShortcutMove' },
    { keys: [ 'Esc' ], labelKey: 'CinemaShortcutClose' },
    { keys: [ '?' ], labelKey: 'CinemaShortcutHelp' }
];

const isTyping = (el: Element | null) => (
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable
);

/** Overlays during which the single-letter shortcuts stay quiet (this help overlay isn't one). */
const BLOCKING_OVERLAYS = '.cinema-modal, .cinema-qs, .cinema-endscreen, .cinema-surprise, .cinema-settings, .cinema-saver';

/** Single-key actions, only when not typing and no other key is held. */
const LETTER_ACTIONS: Record<string, string> = {
    r: SURPRISE_EVENT,
    z: SCREENSAVER_EVENT
};

/**
 * "?" shows the keyboard shortcuts; also handles the single-letter ones
 * (R for Surprise me, Z for the screensaver).
 */
const ShortcutsOverlay: FC = () => {
    const [ isOpen, setIsOpen ] = useState(false);
    useOverlay(isOpen, () => setIsOpen(false));

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || isTyping(document.activeElement)) return;
            if (e.key === '?') {
                e.preventDefault();
                setIsOpen(open => !open);
                return;
            }
            const action = LETTER_ACTIONS[e.key.toLowerCase()];
            // Not while another overlay is open, where letters may mean something else
            if (action && !document.querySelector(BLOCKING_OVERLAYS)) {
                e.preventDefault();
                setIsOpen(false);
                window.dispatchEvent(new Event(action));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    if (!isOpen) return null;

    return (
        <div className='cinema-shortcuts' role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaShortcutHelp')}>
            <button type='button' className='cinema-qs__scrim' tabIndex={-1} aria-hidden='true' onClick={() => setIsOpen(false)} />
            <div className='cinema-shortcuts__panel cinema-glass'>
                <h2>{globalize.translate('CinemaShortcutHelp')}</h2>
                <dl>
                    {SHORTCUTS.map(shortcut => (
                        <div key={shortcut.keys.join('+')} className='cinema-shortcuts__row'>
                            <dt>{shortcut.keys.map(key => <kbd key={key} className='cinema-kbd'>{key}</kbd>)}</dt>
                            <dd>{globalize.translate(shortcut.labelKey)}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
};

export default ShortcutsOverlay;
