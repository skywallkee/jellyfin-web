import { useEffect, useRef } from 'react';

import { getKeyName } from 'scripts/keyboardNavigation';

/** Keys that close an overlay: Escape, Backspace (outside text fields), and remotes' Back. */
const CLOSE_KEYS = new Set([ 'Escape', 'Backspace', 'Back', 'GoBack', 'BrowserBack' ]);

interface Overlay {
    close: () => void;
}

/** Open overlays, oldest first. Only the last one (on top) reacts to Escape/Back. */
const stack: Overlay[] = [];

const isTyping = (target: EventTarget | null) => (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target as HTMLElement | null)?.isContentEditable
);

const onKeyDown = (e: KeyboardEvent) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    // getKeyName also maps TV remotes' numeric Back codes (webOS, Tizen) to 'Back'
    const key = e.key === 'Escape' ? 'Escape' : getKeyName(e);
    if (!CLOSE_KEYS.has(key)) return;
    if (key === 'Backspace' && isTyping(e.target)) return;
    // The key that wakes the screensaver only wakes it
    if (document.querySelector('.cinema-saver')) return;
    e.preventDefault();
    // Nothing else (another overlay, or the app's own Back handling) acts on this key
    e.stopImmediatePropagation();
    top.close();
};

let isListening = false;

const listen = () => {
    if (isListening) return;
    isListening = true;
    window.addEventListener('keydown', onKeyDown, { capture: true });
};

/** Whether any Cinema overlay is open; used to keep single-letter shortcuts quiet meanwhile. */
export const isAnyOverlayOpen = () => stack.length > 0;

/**
 * Registers an open overlay (details card, palette, panel…). Escape, Backspace and a remote's Back
 * close only the most recently opened one, never the ones underneath or the page behind.
 */
export const useOverlay = (isOpen: boolean, close: () => void) => {
    const closeRef = useRef(close);
    closeRef.current = close;

    useEffect(() => {
        if (!isOpen) return;
        listen();
        const entry: Overlay = { close: () => closeRef.current() };
        stack.push(entry);
        return () => {
            const index = stack.indexOf(entry);
            if (index >= 0) stack.splice(index, 1);
        };
    }, [ isOpen ]);
};
