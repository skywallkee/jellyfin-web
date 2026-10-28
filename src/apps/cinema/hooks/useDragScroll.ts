import { type RefObject, useEffect } from 'react';

/** Movement before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 6;
/** How much of its speed a flung row keeps each frame. */
const FRICTION = 0.94;
const MIN_SPEED = 0.3;
/** Fastest fling, in pixels per frame, so a quick flick glides rather than teleports. */
const MAX_SPEED = 45;

/**
 * Lets a horizontal row be dragged with the mouse and flung, gliding to a stop.
 * A drag never counts as a click on the card where it started.
 */
export const useDragScroll = (ref: RefObject<HTMLElement>) => {
    useEffect(() => {
        const track = ref.current;
        if (!track) return;

        let startX = 0;
        let startScroll = 0;
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let isDown = false;
        let isDragging = false;
        let glide = 0;

        // The row normally scrolls smoothly; while dragging it must follow the pointer exactly
        const restoreSmooth = () => {
            track.style.scrollBehavior = '';
        };

        const stopGlide = () => {
            window.cancelAnimationFrame(glide);
            glide = 0;
            restoreSmooth();
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            stopGlide();
            isDown = true;
            isDragging = false;
            startX = lastX = e.clientX;
            startScroll = track.scrollLeft;
            track.style.scrollBehavior = 'auto';
            lastTime = performance.now();
            velocity = 0;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            if (!isDragging) {
                if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
                isDragging = true;
                track.classList.add('is-dragging');
            }
            const now = performance.now();
            const speed = (lastX - e.clientX) / Math.max(1, now - lastTime) * 16;
            velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
            lastX = e.clientX;
            lastTime = now;
            track.scrollLeft = startScroll - dx;
        };

        const onPointerUp = () => {
            if (!isDown) return;
            isDown = false;
            if (!isDragging) {
                restoreSmooth();
                return;
            }
            // Keep the flag until after the click that ends this press has been swallowed; a release
            // outside the row sends no click, so clear it regardless
            window.setTimeout(() => {
                track.classList.remove('is-dragging');
                isDragging = false;
            }, 0);
            const step = () => {
                if (Math.abs(velocity) < MIN_SPEED) {
                    restoreSmooth();
                    return;
                }
                track.scrollLeft += velocity;
                velocity *= FRICTION;
                glide = window.requestAnimationFrame(step);
            };
            glide = window.requestAnimationFrame(step);
        };

        const onClick = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            isDragging = false;
        };

        // Images and links would otherwise start the browser's own drag-and-drop
        const onDragStart = (e: DragEvent) => e.preventDefault();

        track.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        track.addEventListener('click', onClick, { capture: true });
        track.addEventListener('dragstart', onDragStart);
        // Any wheel or touch scroll takes over from a glide in progress
        track.addEventListener('wheel', stopGlide, { passive: true });

        return () => {
            stopGlide();
            track.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            track.removeEventListener('click', onClick, { capture: true });
            track.removeEventListener('dragstart', onDragStart);
            track.removeEventListener('wheel', stopGlide);
        };
    }, [ ref ]);
};
