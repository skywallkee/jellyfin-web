import { useCallback } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import { type CinemaSettings, useCinemaSettings } from './settings';

/** With spoiler-free mode on: an episode not started yet keeps its still and description hidden. */
export const isSpoiler = (settings: CinemaSettings, item?: ItemDto | null) => Boolean(
    settings.spoilerFree
    && item?.Type === 'Episode'
    && !item.UserData?.Played
    && !item.UserData?.PlaybackPositionTicks
);

/** Tells whether an item's still and description should stay hidden, following the setting. */
export const useIsSpoiler = () => {
    const [ settings ] = useCinemaSettings();
    return useCallback((item?: ItemDto | null) => isSpoiler(settings, item), [ settings ]);
};
