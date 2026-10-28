import Close from '@mui/icons-material/Close';
import React, { type FC, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useItem } from 'hooks/useItem';
import globalize from 'lib/globalize';
import { getKeyName } from 'scripts/keyboardNavigation';

import { DETAILS_PARAM, type DetailsCardState } from '../../hooks/useItemLink';

import DetailsView from './DetailsView';

const CLOSE_KEYS = new Set([ 'Escape', 'Back', 'GoBack', 'BrowserBack' ]);

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

    const close = useCallback(() => {
        const state = location.state as DetailsCardState | null;
        if (state?.cinemaDetailsCard) {
            // Opened by clicking a title: step back so the browser's Back stays in sync
            navigate(-1);
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

    useEffect(() => {
        if (!itemId) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!CLOSE_KEYS.has(getKeyName(e)) && e.key !== 'Escape') return;
            // Caught before the app's own Back handling, so Back closes the card instead of leaving the page
            e.preventDefault();
            e.stopPropagation();
            close();
        };
        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [ close, itemId ]);

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
            <div ref={scrollRef} className='cinema-modal__card cinema-glass'>
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
                    <DetailsView key={item.Id} item={item} variant='modal' />}
            </div>
        </div>
    );
};

export default DetailsModal;
