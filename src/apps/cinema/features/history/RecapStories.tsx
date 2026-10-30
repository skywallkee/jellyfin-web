import Close from '@mui/icons-material/Close';
import IosShare from '@mui/icons-material/IosShare';
import classNames from 'classnames';
import React, { type FC, type ReactNode, useCallback, useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useOverlay } from '../../hooks/useOverlay';
import { getBackdropUrl } from '../../utils/images';
import { getDisplayTitle } from '../../utils/items';
import { playSound } from '../../utils/sounds';

import type { YearRecap } from './recap';

/** How long each slide stays before moving on by itself. */
const SLIDE_MS = 6000;

interface Slide {
    key: string;
    eyebrow: string;
    big: ReactNode;
    caption?: string;
    /** Artwork behind the slide. */
    item?: ItemDto;
}

const formatHours = (hours: number) => (hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString());

const monthName = (month: number) => new Date(2000, month, 1).toLocaleDateString(undefined, { month: 'long' });

const buildSlides = (recap: YearRecap): Slide[] => {
    const slides: Slide[] = [
        {
            key: 'intro',
            eyebrow: globalize.translate('CinemaRecapIntro'),
            big: <span className='cinema-recap__year'>{recap.year}</span>,
            caption: globalize.translate('CinemaRecapIntroCaption'),
            item: recap.latest
        },
        {
            key: 'hours',
            eyebrow: globalize.translate('CinemaRecapHoursEyebrow'),
            big: <>{formatHours(recap.hours)}<small>{globalize.translate('CinemaRecapHoursUnit')}</small></>,
            caption: globalize.translate('CinemaRecapTitlesCaption', recap.movies, recap.episodes),
            item: recap.first
        }
    ];
    if (recap.topGenre) {
        slides.push({
            key: 'genre',
            eyebrow: globalize.translate('CinemaRecapGenreEyebrow'),
            big: recap.topGenre.name,
            caption: globalize.translate('CinemaRecapGenreCaption', recap.topGenre.count),
            item: recap.topGenre.item
        });
    }
    if (recap.topShow?.name) {
        slides.push({
            key: 'show',
            eyebrow: globalize.translate('CinemaRecapShowEyebrow'),
            big: recap.topShow.name,
            caption: globalize.translate('CinemaRecapShowCaption', recap.topShow.count),
            item: recap.topShow.item
        });
    }
    if (recap.busiestMonth) {
        slides.push({
            key: 'month',
            eyebrow: globalize.translate('CinemaRecapMonthEyebrow'),
            big: monthName(recap.busiestMonth.month),
            caption: globalize.translate('CinemaRecapMonthCaption', recap.busiestMonth.count)
        });
    }
    if (recap.first) {
        slides.push({
            key: 'first',
            eyebrow: globalize.translate('CinemaRecapFirstEyebrow'),
            big: getDisplayTitle(recap.first),
            caption: recap.latest && recap.latest !== recap.first ?
                globalize.translate('CinemaRecapLatestCaption', getDisplayTitle(recap.latest)) :
                undefined,
            item: recap.first
        });
    }
    slides.push({
        key: 'outro',
        eyebrow: globalize.translate('CinemaRecapOutroEyebrow'),
        big: globalize.translate('CinemaRecapOutro'),
        caption: globalize.translate('CinemaRecapOutroCaption', recap.titles, formatHours(recap.hours)),
        item: recap.topShow?.item ?? recap.latest
    });
    return slides;
};

/** Text to share the recap, e.g. in a chat. */
const getShareText = (recap: YearRecap) => [
    globalize.translate('CinemaRecapShareTitle', String(recap.year)),
    globalize.translate('CinemaRecapOutroCaption', recap.titles, formatHours(recap.hours)),
    recap.topGenre && `${globalize.translate('CinemaRecapGenreEyebrow')} ${recap.topGenre.name}`,
    recap.topShow?.name && `${globalize.translate('CinemaRecapShowEyebrow')} ${recap.topShow.name}`
].filter(Boolean).join('\n');

interface RecapStoriesProps {
    recap: YearRecap;
    onClose: () => void;
}

/**
 * "Your year in Cinema": full-screen slides that move on by themselves, like stories.
 * Tap the right side for the next, the left side for the previous; Esc closes.
 */
const RecapStories: FC<RecapStoriesProps> = ({ recap, onClose }) => {
    const { api } = useApi();
    const slides = buildSlides(recap);
    const [ index, setIndex ] = useState(0);
    const [ isPaused, setIsPaused ] = useState(false);
    const [ shareNote, setShareNote ] = useState<string>();
    const slide = slides[index];
    const isLast = index === slides.length - 1;

    useOverlay(true, onClose);

    const go = useCallback((step: number) => {
        setIndex(current => Math.max(0, Math.min(slides.length - 1, current + step)));
        playSound('move');
    }, [ slides.length ]);

    useEffect(() => {
        if (isPaused || isLast) return;
        const timer = window.setTimeout(() => go(1), SLIDE_MS);
        return () => window.clearTimeout(timer);
    }, [ go, index, isLast, isPaused ]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [ go ]);

    const share = async () => {
        const text = getShareText(recap);
        try {
            if (navigator.share) {
                await navigator.share({ title: globalize.translate('CinemaRecapShareTitle', String(recap.year)), text });
            } else {
                await navigator.clipboard.writeText(text);
                setShareNote(globalize.translate('CinemaCopied'));
            }
        } catch {
            // Sharing cancelled
        }
    };

    const backdropUrl = api && slide.item ? getBackdropUrl(api, slide.item) : undefined;

    return (
        <div className='cinema-recap' role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaRecapTitle', String(recap.year))}>
            <div key={`${slide.key}-bg`} className='cinema-recap__backdrop' style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined} />
            <div className='cinema-recap__bars'>
                {slides.map((entry, i) => (
                    <span key={entry.key} className={classNames('cinema-recap__bar', { 'is-done': i < index })}>
                        {i === index && (
                            <span
                                key={`${index}-fill`}
                                className={classNames('cinema-recap__fill', { 'is-paused': isPaused || isLast })}
                                style={{ animationDuration: `${SLIDE_MS}ms` }}
                            />
                        )}
                    </span>
                ))}
            </div>
            <button type='button' className='cinema-recap__close cinema-iconbtn cinema-glass cinema-focusable' onClick={onClose} aria-label={globalize.translate('ButtonClose')}>
                <Close />
            </button>

            {/* Tapping either half moves between slides; holding pauses */}
            <button
                type='button'
                className='cinema-recap__tap cinema-recap__tap--prev'
                aria-label={globalize.translate('Previous')}
                onClick={() => go(-1)}
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
            />
            <button
                type='button'
                className='cinema-recap__tap cinema-recap__tap--next'
                aria-label={globalize.translate('Next')}
                onClick={() => go(1)}
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
            />

            <div key={slide.key} className='cinema-recap__slide'>
                <p className='cinema-recap__eyebrow'>{slide.eyebrow}</p>
                <p className='cinema-recap__big'>{slide.big}</p>
                {slide.caption && <p className='cinema-recap__caption'>{slide.caption}</p>}
                {isLast && (
                    <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable cinema-recap__share' onClick={share}>
                        <IosShare />
                        {shareNote ?? globalize.translate('Share')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default RecapStories;
