/**
 * Where on screen the last clicked card was, so the details card can grow out of it.
 * Kept briefly: an old click shouldn't steer a card opened later from somewhere else.
 */
const MAX_AGE_MS = 1500;

let lastRect: { rect: DOMRect; time: number } | undefined;

export const rememberOrigin = (element: Element) => {
    lastRect = { rect: element.getBoundingClientRect(), time: Date.now() };
};

/** The remembered card's position, if it was clicked just now. Each call uses it up. */
export const takeOrigin = () => {
    const origin = lastRect && Date.now() - lastRect.time < MAX_AGE_MS ? lastRect.rect : undefined;
    lastRect = undefined;
    return origin;
};
