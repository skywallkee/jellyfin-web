import Check from '@mui/icons-material/Check';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import { useQueryClient } from '@tanstack/react-query';
import React, { type FC, useCallback, useEffect, useState } from 'react';

import { useToggleFavoriteMutation, useTogglePlayedMutation } from 'hooks/useFetchItems';
import globalize from 'lib/globalize';

import { refreshUserData } from '../utils/refresh';
import type { ItemDto } from 'types/base/models/item-dto';

/**
 * Keeps a local copy of a user-data flag so the button flips instantly,
 * and rolls it back if the server call fails.
 */
const useOptimisticFlag = (value: boolean) => {
    const [ flag, setFlag ] = useState(value);
    useEffect(() => setFlag(value), [ value ]);
    return [ flag, setFlag ] as const;
};

const BURST_PARTICLES = 10;

/** A ring of little hearts and sparks flying out of the button. */
const Burst: FC = () => (
    <span className='cinema-burst' aria-hidden='true'>
        {Array.from({ length: BURST_PARTICLES }, (_, i) => (
            <i key={i} style={{ '--cinema-angle': `${(360 / BURST_PARTICLES) * i}deg` } as React.CSSProperties} />
        ))}
    </span>
);

export const FavoriteButton: FC<{ item: ItemDto }> = ({ item }) => {
    const [ isFavorite, setIsFavorite ] = useOptimisticFlag(Boolean(item.UserData?.IsFavorite));
    // Counts favourites given here, so each one plays a fresh burst
    const [ burstCount, setBurstCount ] = useState(0);
    const { mutate } = useToggleFavoriteMutation();
    const queryClient = useQueryClient();

    const onClick = useCallback(() => {
        if (!item.Id) return;
        const wasFavorite = isFavorite;
        setIsFavorite(!wasFavorite);
        if (!wasFavorite) setBurstCount(c => c + 1);
        mutate(
            { itemId: item.Id, isFavorite: wasFavorite },
            {
                onError: () => setIsFavorite(wasFavorite),
                onSettled: () => refreshUserData(queryClient)
            }
        );
    }, [ isFavorite, item.Id, mutate, queryClient, setIsFavorite ]);

    return (
        <button
            type='button'
            className='cinema-btn cinema-btn--round cinema-glass cinema-focusable cinema-has-burst'
            onClick={onClick}
            aria-pressed={isFavorite}
            aria-label={globalize.translate('Favorite')}
            title={globalize.translate('Favorite')}
        >
            {/* Keyed so the icon remounts and plays its pop animation on each toggle */}
            {isFavorite ?
                <Favorite key='on' className='cinema-pop cinema-heart' /> :
                <FavoriteBorder key='off' />}
            {isFavorite && burstCount > 0 && <Burst key={burstCount} />}
        </button>
    );
};

export const PlayedButton: FC<{ item: ItemDto }> = ({ item }) => {
    const [ isPlayed, setIsPlayed ] = useOptimisticFlag(Boolean(item.UserData?.Played));
    const { mutate } = useTogglePlayedMutation();
    const queryClient = useQueryClient();
    const label = globalize.translate(isPlayed ? 'MarkUnplayed' : 'MarkPlayed');

    const onClick = useCallback(() => {
        if (!item.Id) return;
        const wasPlayed = isPlayed;
        setIsPlayed(!wasPlayed);
        mutate(
            { itemId: item.Id, isPlayed: wasPlayed },
            {
                onError: () => setIsPlayed(wasPlayed),
                // Progress, Next Up and episode lists all depend on played state
                onSettled: () => refreshUserData(queryClient)
            }
        );
    }, [ isPlayed, item.Id, mutate, queryClient, setIsPlayed ]);

    return (
        <button
            type='button'
            className='cinema-btn cinema-btn--round cinema-glass cinema-focusable'
            onClick={onClick}
            aria-pressed={isPlayed}
            aria-label={label}
            title={label}
        >
            <Check
                key={isPlayed ? 'on' : 'off'}
                className={isPlayed ? 'cinema-pop' : undefined}
                sx={{ color: isPlayed ? 'var(--cinema-accent)' : undefined }}
            />
        </button>
    );
};
