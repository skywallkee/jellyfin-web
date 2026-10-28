import React, { type FC, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';

/** Dispatch this on window to open quick search, e.g. from a button. */
export const QUICK_SEARCH_EVENT = 'cinema:quicksearch';

// The palette (and its search queries) only loads the first time it's opened, or in the background once idle
const Palette = lazy(() => import(/* webpackChunkName: "cinema-quicksearch" */ './QuickSearchPalette'));

const isTyping = (el: Element | null) => (
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable
);

/**
 * Search from anywhere: Ctrl+K (or ⌘K, or "/") opens a palette with instant results,
 * arrow keys to choose and Enter to open the details card.
 */
const QuickSearch: FC = () => {
    const [ isOpen, setIsOpen ] = useState(false);
    const isOpenRef = useRef(false);
    isOpenRef.current = isOpen;
    const returnFocusRef = useRef<HTMLElement | null>(null);

    const open = useCallback(() => {
        returnFocusRef.current = document.activeElement as HTMLElement | null;
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        returnFocusRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const isShortcut = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
            const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(document.activeElement);
            if (!isShortcut && !isSlash) return;
            e.preventDefault();
            // The shortcut toggles; "/" only opens
            if (isOpenRef.current) {
                if (isShortcut) close();
            } else {
                open();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener(QUICK_SEARCH_EVENT, open);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener(QUICK_SEARCH_EVENT, open);
        };
    }, [ close, open ]);

    return isOpen ? (
        <Suspense fallback={null}>
            <Palette onClose={close} />
        </Suspense>
    ) : null;
};

export default QuickSearch;
