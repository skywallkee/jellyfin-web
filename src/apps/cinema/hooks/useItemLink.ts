import { useCallback } from 'react';
import { type To, useLocation } from 'react-router-dom';

import type { ItemDto } from 'types/base/models/item-dto';

import { getItemPath } from '../utils/actions';

/** The URL parameter that opens the details card over the current page. */
export const DETAILS_PARAM = 'item';

/** Item types that open in the Cinema details card. Others (people, albums, collections…) open their full page. */
export const CINEMA_DETAIL_TYPES = new Set([ 'Movie', 'Series', 'Season', 'Episode', 'Video', 'MusicVideo', 'Trailer' ]);

/** Router state marking a history entry that was pushed to open the details card. */
export interface DetailsCardState {
    cinemaDetailsCard?: boolean;
}

/**
 * Returns a function giving the link target for an item: the details card over the current page
 * for movies, shows and videos, or the item's full page for everything else.
 */
export const useItemLink = () => {
    const location = useLocation();

    return useCallback((item: ItemDto): { to: To; state?: DetailsCardState } => {
        if (!item.Id || !CINEMA_DETAIL_TYPES.has(item.Type ?? '')) {
            return { to: getItemPath(item) };
        }
        const params = new URLSearchParams(location.search);
        params.set(DETAILS_PARAM, item.Id);
        return {
            to: { pathname: location.pathname, search: `?${params.toString()}` },
            state: { cinemaDetailsCard: true }
        };
    }, [ location.pathname, location.search ]);
};
