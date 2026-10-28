import { type RefObject, useEffect, useState } from 'react';

const supportsObserver = () => typeof window !== 'undefined' && 'IntersectionObserver' in window;

/**
 * Becomes true the first time the element scrolls near the viewport, and stays true.
 * Without IntersectionObserver support it's true straight away, so nothing stays hidden.
 */
export const useInView = (ref: RefObject<Element>, rootMargin = '0px 0px -10% 0px') => {
    const [ isInView, setIsInView ] = useState(() => !supportsObserver());

    useEffect(() => {
        const element = ref.current;
        if (isInView || !element) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setIsInView(true);
                observer.disconnect();
            }
        }, { rootMargin });
        observer.observe(element);
        return () => observer.disconnect();
    }, [ isInView, ref, rootMargin ]);

    return isInView;
};
