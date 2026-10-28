import { useCallback, useEffect, useState } from 'react';

const supportsObserver = () => typeof window !== 'undefined' && 'IntersectionObserver' in window;

/**
 * Becomes true the first time the element scrolls near the viewport, and stays true.
 * Returns a ref callback, so it also works for elements that only appear later
 * (e.g. a row that renders once its items have loaded).
 * Without IntersectionObserver support it's true straight away, so nothing stays hidden.
 */
export const useInView = <T extends Element>(rootMargin = '0px 0px -10% 0px') => {
    const [ element, setElement ] = useState<T | null>(null);
    const [ isInView, setIsInView ] = useState(() => !supportsObserver());
    const ref = useCallback((node: T | null) => setElement(node), []);

    useEffect(() => {
        if (isInView || !element) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setIsInView(true);
                observer.disconnect();
            }
        }, { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ element, isInView, rootMargin ]);

    return [ ref, isInView ] as const;
};
