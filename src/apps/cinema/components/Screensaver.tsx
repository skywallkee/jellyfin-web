import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import { useQuery } from '@tanstack/react-query';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { getBackdropUrl, getLogoUrl, hasBackdrop } from '../utils/images';
import { getDisplayTitle } from '../utils/items';
import { useCinemaSettings } from '../utils/settings';

/** Idle time before the screensaver starts. */
const IDLE_MS = 3 * 60_000;
/** How long each piece of artwork stays up. */
const SLIDE_MS = 9000;
const SLIDE_COUNT = 24;
const ACTIVITY_EVENTS = [ 'pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart' ] as const;
/** Dispatch this on window to start the screensaver straight away (handy for trying it out). */
export const SCREENSAVER_EVENT = 'cinema:screensaver';

const useSlides = (isEnabled: boolean) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'ScreensaverSlides' ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Video ],
                fields: [ ItemFields.PrimaryImageAspectRatio ],
                enableImageTypes: [ ImageType.Backdrop, ImageType.Logo, ImageType.Primary ],
                imageTypeLimit: 1,
                sortBy: [ ItemSortBy.Random ],
                // Fetch extra, since only titles with wide artwork (a backdrop or a video still) are used
                limit: SLIDE_COUNT * 2
            }, { signal });
            return ((response.data.Items ?? []) as ItemDto[]).filter(hasBackdrop).slice(0, SLIDE_COUNT);
        },
        enabled: isEnabled && !!api && !!user?.Id,
        staleTime: Infinity
    });
};

/** Becomes true after a stretch with no input, and false again on the next input. */
const useIsIdle = (isEnabled: boolean) => {
    const [ isIdle, setIsIdle ] = useState(false);
    const isIdleRef = useRef(false);
    isIdleRef.current = isIdle;

    useEffect(() => {
        if (!isEnabled) {
            setIsIdle(false);
            return;
        }
        let timer = 0;
        let lastRestart = 0;
        const restart = () => {
            lastRestart = Date.now();
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                // Never cover a video that's playing (e.g. picture-in-picture or audio with visuals)
                if (!playbackManager.isPlayingVideo()) setIsIdle(true);
            }, IDLE_MS);
        };
        const onActivity = (e: Event) => {
            // The key that wakes the screen shouldn't also click or select something
            if (isIdleRef.current && e.type === 'keydown') {
                e.preventDefault();
                // Stops every other handler too (e.g. an open card's Escape), so waking up is all it does
                e.stopImmediatePropagation();
            }
            if (isIdleRef.current) setIsIdle(false);
            // Moving the mouse fires constantly; resetting the countdown once a second is plenty
            if (isIdleRef.current || Date.now() - lastRestart > 1000) restart();
        };
        const startNow = () => setIsIdle(true);

        restart();
        for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { capture: true, passive: type !== 'keydown' });
        window.addEventListener(SCREENSAVER_EVENT, startNow);
        return () => {
            window.clearTimeout(timer);
            for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, { capture: true });
            window.removeEventListener(SCREENSAVER_EVENT, startNow);
        };
    }, [ isEnabled ]);

    return isIdle;
};

const useClock = () => {
    const [ now, setNow ] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    return now;
};

const Clock: FC = () => {
    const now = useClock();
    return (
        <div className='cinema-saver__clock'>
            <span className='cinema-saver__time'>
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className='cinema-saver__date'>
                {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
        </div>
    );
};

const Slideshow: FC<{ slides: ItemDto[] }> = ({ slides }) => {
    const { api } = useApi();
    const [ index, setIndex ] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => setIndex(i => (i + 1) % slides.length), SLIDE_MS);
        return () => window.clearInterval(timer);
    }, [ slides.length ]);

    if (!api) return null;
    const slide = slides[index % slides.length];
    const logoUrl = getLogoUrl(api, slide, 600);

    return (
        <>
            {/* Keyed so each slide fades and drifts in on its own */}
            <div
                key={slide.Id}
                className='cinema-saver__slide'
                style={{ backgroundImage: `url("${getBackdropUrl(api, slide)}")` }}
            />
            <div key={`${slide.Id}-title`} className='cinema-saver__title'>
                {logoUrl ? <img src={logoUrl} alt='' /> : getDisplayTitle(slide)}
            </div>
        </>
    );
};

/**
 * After a few idle minutes, the screen turns into a slow slideshow of artwork from the
 * user's libraries with a large clock, like a TV's ambient mode. Any input brings the app back.
 */
const Screensaver: FC = () => {
    const [ settings ] = useCinemaSettings();
    const location = useLocation();
    const isAllowed = settings.screensaver && location.pathname !== '/video';
    const isIdle = useIsIdle(isAllowed);
    const { data: slides } = useSlides(isAllowed);

    if (!isIdle || !slides?.length) return null;

    return (
        <div className='cinema-saver' aria-hidden='true'>
            <Slideshow slides={slides} />
            <Clock />
        </div>
    );
};

export default Screensaver;
