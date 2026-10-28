import React, { type FC, type PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { type To, useLocation } from 'react-router-dom';

import type { ItemDto } from 'types/base/models/item-dto';

import { getItemPath } from '../utils/actions';

/** The URL parameter that opens the details card over the current page. */
export const DETAILS_PARAM = 'item';

/** Item types that open in the Cinema details card. Others (albums, collections…) open their full page. */
export const CINEMA_DETAIL_TYPES = new Set([ 'Movie', 'Series', 'Season', 'Episode', 'Video', 'MusicVideo', 'Trailer', 'Person', 'Genre' ]);

/** Router state marking a history entry that was pushed to open the details card. */
export interface DetailsCardState {
    cinemaDetailsCard?: boolean;
    /** How many cards deep this one was opened (1 from the page, 2 from inside a card…). */
    cinemaDepth?: number;
}

/** The depth of the card currently open, read from the router's entry in browser history. */
const getCurrentDepth = () => {
    const state = (window.history.state as { usr?: DetailsCardState } | null)?.usr;
    const hasCard = new URLSearchParams(window.location.hash.split('?')[1] ?? '').has(DETAILS_PARAM);
    return hasCard && state?.cinemaDetailsCard ? state.cinemaDepth ?? 1 : 0;
};

type GetItemLink = (item: ItemDto) => { to: To; state?: DetailsCardState };

/** The page's address without the details card parameter, which is all a link to a card depends on. */
const useBaseLocation = () => {
    const { pathname, search } = useLocation();
    const params = new URLSearchParams(search);
    params.delete(DETAILS_PARAM);
    return { pathname, baseSearch: params.toString() };
};

const createGetItemLink = (pathname: string, baseSearch: string): GetItemLink => item => {
    if (!item.Id || !CINEMA_DETAIL_TYPES.has(item.Type ?? '')) {
        return { to: getItemPath(item) };
    }
    const params = new URLSearchParams(baseSearch);
    params.set(DETAILS_PARAM, item.Id);
    return {
        to: { pathname, search: `?${params.toString()}` },
        // Links are built when they render, which inside a card is after that card opened
        state: { cinemaDetailsCard: true, cinemaDepth: getCurrentDepth() + 1 }
    };
};

/** Outside the provider, read the current address from the URL at the moment a link is built. */
const getItemLinkFromWindow: GetItemLink = item => {
    const [ pathname, search = '' ] = window.location.hash.replace(/^#/, '').split('?');
    const params = new URLSearchParams(search);
    params.delete(DETAILS_PARAM);
    return createGetItemLink(pathname || '/', params.toString())(item);
};

const ItemLinkContext = createContext<GetItemLink>(getItemLinkFromWindow);

/**
 * Shares one link builder with every card. It only changes when the page itself changes, not when
 * a details card opens or closes, so the hundreds of cards on a page don't all re-render each time.
 */
export const ItemLinkProvider: FC<PropsWithChildren> = ({ children }) => {
    const { pathname, baseSearch } = useBaseLocation();
    const getItemLink = useMemo(() => createGetItemLink(pathname, baseSearch), [ pathname, baseSearch ]);
    return <ItemLinkContext.Provider value={getItemLink}>{children}</ItemLinkContext.Provider>;
};

/**
 * Returns a function giving the link target for an item: the details card over the current page
 * for movies, shows and videos, or the item's full page for everything else.
 */
export const useItemLink = (): GetItemLink => useContext(ItemLinkContext);
