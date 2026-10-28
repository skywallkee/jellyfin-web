import { useEffect } from 'react';

/** Glass surfaces that light up where the pointer is. */
export const GLOW_SELECTOR = [
    '.cinema-topnav',
    '.cinema-btn.cinema-glass',
    '.cinema-iconbtn.cinema-glass',
    '.cinema-library__toolbar',
    '.cinema-settings',
    '.cinema-qs__panel',
    '.cinema-panel',
    '.cinema-fact',
    '.cinema-tile'
].join(',');

/**
 * Tracks the pointer over glass surfaces and hands its position to CSS, which draws a soft
 * light there and brightens the nearest edge, like light catching a pane of glass.
 */
export const useCursorGlow = (isEnabled: boolean) => {
    useEffect(() => {
        if (!isEnabled || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
        let frame = 0;
        let lastEvent: PointerEvent | undefined;

        const update = () => {
            frame = 0;
            const target = lastEvent?.target;
            if (!(target instanceof Element) || !lastEvent) return;
            const surface = target.closest<HTMLElement>(GLOW_SELECTOR);
            if (!surface) return;
            const rect = surface.getBoundingClientRect();
            surface.style.setProperty('--cinema-gx', `${Math.round(lastEvent.clientX - rect.left)}px`);
            surface.style.setProperty('--cinema-gy', `${Math.round(lastEvent.clientY - rect.top)}px`);
        };

        const onPointerMove = (e: PointerEvent) => {
            lastEvent = e;
            frame ||= window.requestAnimationFrame(update);
        };

        document.addEventListener('pointermove', onPointerMove, { passive: true });
        return () => {
            document.removeEventListener('pointermove', onPointerMove);
            window.cancelAnimationFrame(frame);
        };
    }, [ isEnabled ]);
};
