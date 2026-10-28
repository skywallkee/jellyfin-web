import { useEffect } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

const KEY_DIRECTIONS: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
};

const VECTORS: Record<Direction, [number, number]> = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
};

const FOCUSABLE_QUERY = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const TEXT_INPUT_TYPES = new Set([ 'text', 'search', 'email', 'password', 'number', 'url', 'tel' ]);

/** Penalty for drifting sideways from the direction of travel; keeps moves in the same row or column. */
const CROSS_AXIS_WEIGHT = 2.2;

const isTextEntry = (el: Element | null) => {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable) return true;
    return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((el as HTMLInputElement).type);
};

const isVisible = (el: HTMLElement) => {
    // Elements taken out of the tab order are deliberately skipped
    if (el.getAttribute('tabindex') === '-1') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
};

const isInFixedContainer = (el: HTMLElement) => {
    let node: HTMLElement | null = el;
    while (node && node !== document.body) {
        if (window.getComputedStyle(node).position === 'fixed') return true;
        node = node.parentElement;
    }
    return false;
};

const center = (rect: DOMRect) => [ rect.left + rect.width / 2, rect.top + rect.height / 2 ];

/** Whether two rects share some vertical span, i.e. sit in the same row. */
const overlapsVertically = (a: DOMRect, b: DOMRect) => a.top < b.bottom && b.top < a.bottom;

/**
 * Finds the nearest focusable element in a direction, scoring by distance along and across the move.
 * With `sameRowOnly`, left and right stay within the current row so focus never jumps diagonally.
 */
export const findNext = (from: HTMLElement, direction: Direction, candidates: HTMLElement[], sameRowOnly = false) => {
    const [ dx, dy ] = VECTORS[direction];
    const fromRect = from.getBoundingClientRect();
    const [ fx, fy ] = center(fromRect);
    let best: HTMLElement | undefined;
    let bestScore = Infinity;

    for (const el of candidates) {
        if (el === from || el.contains(from) || from.contains(el)) continue;
        const rect = el.getBoundingClientRect();
        if (sameRowOnly && !overlapsVertically(fromRect, rect)) continue;
        const [ cx, cy ] = center(rect);
        const along = (cx - fx) * dx + (cy - fy) * dy;
        if (along <= 1) continue;
        const across = Math.abs((cx - fx) * dy) + Math.abs((cy - fy) * dx);
        const score = along + across * CROSS_AXIS_WEIGHT;
        if (score < bestScore) {
            bestScore = score;
            best = el;
        }
    }

    return best;
};

const focusElement = (el: HTMLElement, direction?: Direction) => {
    el.focus({ preventScroll: true });
    if (isInFixedContainer(el)) return;
    const vertical = direction === 'up' || direction === 'down';
    el.scrollIntoView({
        block: vertical ? 'center' : 'nearest',
        inline: 'nearest',
        behavior: 'smooth'
    });
};

/**
 * Moves focus with the arrow keys, like a TV remote, and goes back with Backspace.
 * Used by the Cinema layout in TV mode.
 */
export const useSpatialNavigation = (enabled: boolean) => {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

            const active = document.activeElement as HTMLElement | null;

            // Remote "Back" keys are already handled by scripts/keyboardNavigation, so only Backspace is added here
            if (e.key === 'Backspace' && !isTextEntry(active)) {
                e.preventDefault();
                window.history.back();
                return;
            }

            const direction = KEY_DIRECTIONS[e.key];
            if (!direction) return;
            // Let text fields keep left/right for moving the cursor
            if (isTextEntry(active) && (direction === 'left' || direction === 'right')) return;
            // Let open dialogs and menus handle their own keys
            if (active?.closest('[role="dialog"], [role="menu"], [role="listbox"], .dialogContainer')) return;

            const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_QUERY)).filter(isVisible);
            if (!candidates.length) return;

            e.preventDefault();

            if (!active || active === document.body || !candidates.includes(active)) {
                // Start in the page content rather than the navigation
                const main = document.querySelector('.cinema-main');
                focusElement(candidates.find(el => main?.contains(el)) ?? candidates[0]);
                return;
            }

            const isHorizontal = direction === 'left' || direction === 'right';
            // Left/right stay in the row; if the row ends, they can still reach the fixed navigation (the TV rail)
            const next = findNext(active, direction, candidates, isHorizontal)
                ?? (isHorizontal ? findNext(active, direction, candidates.filter(isInFixedContainer)) : undefined);
            if (next) focusElement(next, direction);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ enabled ]);
};
