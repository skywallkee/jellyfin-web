import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import classNames from 'classnames';
import React, { type FC, type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { useDragScroll } from '../hooks/useDragScroll';

/** How much of the visible width one arrow click scrolls. */
const PAGE_FRACTION = 0.85;

interface ScrollTrackProps {
    className?: string;
    /** Accessible name for the group of items, when the track isn't already inside a labelled section. */
    label?: string;
}

/**
 * A horizontally scrolling row with arrow buttons that appear on hover
 * while there's more to see in that direction. It can also be dragged and flung with the mouse.
 */
const ScrollTrack: FC<PropsWithChildren<ScrollTrackProps>> = ({ className, label, children }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [ canScrollLeft, setCanScrollLeft ] = useState(false);
    const [ canScrollRight, setCanScrollRight ] = useState(false);
    useDragScroll(trackRef);

    const update = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        setCanScrollLeft(track.scrollLeft > 4);
        setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        update();
        track.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            track.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [ update, children ]);

    const scrollBy = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * track.clientWidth * PAGE_FRACTION, behavior: 'smooth' });
    };

    return (
        <div className='cinema-scroll'>
            {/* Arrows are for the mouse; keyboard and remote users scroll by moving focus */}
            <button
                type='button'
                tabIndex={-1}
                aria-hidden='true'
                className={classNames('cinema-scroll__arrow cinema-scroll__arrow--left cinema-glass', { 'is-visible': canScrollLeft })}
                onClick={() => scrollBy(-1)}
            >
                <ChevronLeft />
            </button>
            <div
                ref={trackRef}
                className={className}
                role={label ? 'group' : undefined}
                aria-label={label}
            >
                {children}
            </div>
            <button
                type='button'
                tabIndex={-1}
                aria-hidden='true'
                className={classNames('cinema-scroll__arrow cinema-scroll__arrow--right cinema-glass', { 'is-visible': canScrollRight })}
                onClick={() => scrollBy(1)}
            >
                <ChevronRight />
            </button>
        </div>
    );
};

export default ScrollTrack;
