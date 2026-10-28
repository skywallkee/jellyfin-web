import Close from '@mui/icons-material/Close';
import React, { type CSSProperties, type FC, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useItem } from 'hooks/useItem';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { DETAILS_PARAM, type DetailsCardState } from '../../hooks/useItemLink';
import { useOverlay } from '../../hooks/useOverlay';
import { useClipTurn } from '../../utils/clip';
import { takeOrigin } from '../../utils/originRect';
import { playSound } from '../../utils/sounds';

// The details (episodes, cast, similar titles…) load on first open, or in the background once idle
const DetailsView = lazy(() => import(/* webpackChunkName: "cinema-details" */ './DetailsView'));
const PersonView = lazy(() => import(/* webpackChunkName: "cinema-person" */ './PersonView'));
const GenreView = lazy(() => import(/* webpackChunkName: "cinema-genre" */ './GenreView'));

/** The view for an item: people and genres get their own, everything else the title details. */
const CardView: FC<{ item: ItemDto }> = ({ item }) => {
    if (item.Type === 'Person') return <PersonView item={item} />;
    if (item.Type === 'Genre') return <GenreView item={item} />;
    return <DetailsView item={item} variant='modal' />;
};

/** The card's widest size and its distance from the screen edges, matching the styles. */
const CARD_MAX_WIDTH = 1200;
const CARD_MARGIN = 32;

/**
 * Where the card should grow from: the clicked card's position and size, relative to the
 * details card's centred position. Without a recent click it just rises into place.
 */
const getOriginStyle = (): CSSProperties | undefined => {
    const rect = takeOrigin();
    if (!rect) return undefined;
    const cardWidth = Math.min(CARD_MAX_WIDTH, window.innerWidth - CARD_MARGIN * 2);
    const dx = rect.left + rect.width / 2 - window.innerWidth / 2;
    const dy = rect.top + rect.height / 2 - window.innerHeight / 2;
    return {
        '--cinema-origin-x': `${Math.round(dx)}px`,
        '--cinema-origin-y': `${Math.round(dy)}px`,
        '--cinema-origin-scale': Math.max(0.12, rect.width / cardWidth).toFixed(3)
    } as CSSProperties;
};

/** How far the card must be pulled down before letting go closes it. */
const SWIPE_CLOSE_PX = 110;

/**
 * On touch screens, pulling the card down from its top closes it: the card follows the finger,
 * and springs back if let go early.
 */
const useSwipeToClose = (ref: React.RefObject<HTMLDivElement>, isOpen: boolean, onClose: () => void) => {
    useEffect(() => {
        const card = ref.current;
        if (!card || !isOpen) return;
        let startY = 0;
        let pull = 0;
        let isTracking = false;

        const onStart = (e: TouchEvent) => {
            // Only when already at the top, so normal scrolling inside the card still works
            isTracking = card.scrollTop <= 0 && e.touches.length === 1;
            startY = e.touches[0]?.clientY ?? 0;
            pull = 0;
            card.style.transition = 'none';
        };
        const onMove = (e: TouchEvent) => {
            if (!isTracking) return;
            pull = Math.max(0, (e.touches[0]?.clientY ?? startY) - startY);
            if (pull > 0 && card.scrollTop > 0) {
                isTracking = false;
                return;
            }
            card.style.transform = pull ? `translateY(${pull * 0.6}px) scale(${1 - Math.min(pull, 400) / 4000})` : '';
            card.style.opacity = pull ? String(1 - Math.min(pull, 400) / 800) : '';
        };
        const onEnd = () => {
            if (!isTracking) return;
            isTracking = false;
            card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease';
            if (pull > SWIPE_CLOSE_PX) {
                card.style.transform = 'translateY(60vh)';
                card.style.opacity = '0';
                window.setTimeout(onClose, 220);
            } else {
                card.style.transform = '';
                card.style.opacity = '';
            }
        };

        card.addEventListener('touchstart', onStart, { passive: true });
        card.addEventListener('touchmove', onMove, { passive: true });
        card.addEventListener('touchend', onEnd);
        card.addEventListener('touchcancel', onEnd);
        return () => {
            card.removeEventListener('touchstart', onStart);
            card.removeEventListener('touchmove', onMove);
            card.removeEventListener('touchend', onEnd);
            card.removeEventListener('touchcancel', onEnd);
            card.style.transform = '';
            card.style.opacity = '';
            card.style.transition = '';
        };
    }, [ isOpen, onClose, ref ]);
};

/** The details card shown over the current page when the URL has ?item=<id>. */
const DetailsModal: FC = () => {
    const [ searchParams, setSearchParams ] = useSearchParams();
    const itemId = searchParams.get(DETAILS_PARAM) ?? undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const { data: item, isPending } = useItem(itemId);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Remember what had focus (usually the card that was clicked) to return to it on close
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const [ originStyle, setOriginStyle ] = useState<CSSProperties>();
    const isOpen = Boolean(itemId);

    // Read the clicked card's position once, when the card opens (not when moving between titles inside it)
    // (before paint, so the first frame already starts from the card)
    useLayoutEffect(() => {
        setOriginStyle(isOpen ? getOriginStyle() : undefined);
    }, [ isOpen ]);

    const close = useCallback(() => {
        playSound('back');
        const state = location.state as DetailsCardState | null;
        if (state?.cinemaDetailsCard) {
            // Opened by clicking titles (perhaps several deep, e.g. a film → an actor → another film):
            // step back past all of them, so one close returns to the page and Back stays in sync
            navigate(-(state.cinemaDepth ?? 1));
        } else {
            setSearchParams(params => {
                const next = new URLSearchParams(params);
                next.delete(DETAILS_PARAM);
                return next;
            }, { replace: true });
        }
    }, [ location.state, navigate, setSearchParams ]);

    useEffect(() => {
        if (!itemId) return;
        returnFocusRef.current ??= document.activeElement as HTMLElement | null;
        // Stop the page behind from scrolling while the card is open
        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        root.style.overflow = 'hidden';
        return () => {
            root.style.overflow = previousOverflow;
        };
    }, [ itemId ]);

    // Return focus once the card closes
    useEffect(() => {
        if (itemId || !returnFocusRef.current) return;
        returnFocusRef.current.focus({ preventScroll: true });
        returnFocusRef.current = null;
    }, [ itemId ]);

    // Each new item (e.g. picked from "More like this") starts at the top
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [ itemId ]);

    useSwipeToClose(scrollRef, isOpen, close);

    // Escape / Back close the card (only when it's the top overlay), before the app's own Back handling
    useOverlay(isOpen, close);
    // While the card is open, clips behind it (like the hero's) pause, even if the card has none of its own
    useClipTurn(isOpen);

    // Keep keyboard and remote focus inside the card: when it opens or shows a new title, focus moves
    // to the card itself (unless something inside, like the Play button on TV, already took it)
    useEffect(() => {
        const card = scrollRef.current;
        // Not while a screen above it (like the end screen after playback) holds focus
        if (!card || !item || document.querySelector('.cinema-endscreen')) return;
        if (!card.contains(document.activeElement)) card.focus({ preventScroll: true });
    }, [ item ]);

    if (!itemId) return null;

    return (
        <div
            className='cinema-modal'
            role='dialog'
            aria-modal='true'
            aria-label={item?.Name ?? undefined}
        >
            {/* The dimmed area around the card; clicking it closes the card */}
            <button
                type='button'
                className='cinema-modal__scrim'
                tabIndex={-1}
                aria-hidden='true'
                onClick={close}
            />
            <div
                ref={scrollRef}
                tabIndex={-1}
                className={originStyle ? 'cinema-modal__card cinema-glass is-from-origin' : 'cinema-modal__card cinema-glass'}
                style={originStyle}
            >
                <button
                    type='button'
                    className='cinema-modal__close cinema-iconbtn cinema-glass cinema-focusable'
                    onClick={close}
                    aria-label={globalize.translate('ButtonClose')}
                >
                    <Close />
                </button>
                {isPending || !item ?
                    <div className='cinema-modal__loading cinema-skeleton' aria-busy='true' /> :
                    <Suspense fallback={<div className='cinema-modal__loading cinema-skeleton' aria-busy='true' />}>
                        <CardView key={item.Id} item={item} />
                    </Suspense>}
            </div>
        </div>
    );
};

export default DetailsModal;
