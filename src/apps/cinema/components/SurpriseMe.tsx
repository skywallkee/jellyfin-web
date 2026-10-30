import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import Casino from '@mui/icons-material/Casino';
import { useQuery } from '@tanstack/react-query';
import React, { type FC, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useItemLink } from '../hooks/useItemLink';
import { withoutDisliked } from '../utils/taste';
import { useOverlay } from '../hooks/useOverlay';

/** Dispatch this on window to start a pick from anywhere. */
export const SURPRISE_EVENT = 'cinema:surprise';

const POOL_SIZE = 24;
const useCandidates = (isEnabled: boolean) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'Surprise' ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                recursive: true,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                filters: [ ItemFilter.IsUnplayed ],
                imageTypes: [ ImageType.Primary ],
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1,
                sortBy: [ ItemSortBy.Random ],
                limit: POOL_SIZE
            }, { signal });
            return withoutDisliked((response.data.Items ?? []) as ItemDto[]);
        },
        enabled: isEnabled && !!api && !!user?.Id,
        // A fresh shuffle every time
        gcTime: 0,
        staleTime: 0
    });
};

// The reel only loads the first time it's needed, or in the background once the app is idle
const Reel = lazy(() => import(/* webpackChunkName: "cinema-surprise" */ './SurpriseReel'));

/**
 * "Surprise me": a slot-machine reel of unwatched posters spins, slows and lands on one,
 * then its details open. Started from the dice button or the {@link SURPRISE_EVENT}.
 */
export const SurpriseMe: FC = () => {
    const [ isOpen, setIsOpen ] = useState(false);
    const navigate = useNavigate();
    const getItemLink = useItemLink();
    const { data: pool, isFetching } = useCandidates(isOpen);

    useEffect(() => {
        const open = () => setIsOpen(true);
        window.addEventListener(SURPRISE_EVENT, open);
        return () => window.removeEventListener(SURPRISE_EVENT, open);
    }, []);

    // Escape / Back cancel the pick
    useOverlay(isOpen, () => setIsOpen(false));

    // Nothing unwatched to pick from: just close
    useEffect(() => {
        if (isOpen && !isFetching && pool && !pool.length) setIsOpen(false);
    }, [ isFetching, isOpen, pool ]);

    const close = useCallback(() => setIsOpen(false), []);
    const onDone = useCallback((item: ItemDto) => {
        setIsOpen(false);
        const { to, state } = getItemLink(item);
        navigate(to, { state });
    }, [ getItemLink, navigate ]);

    if (!isOpen || isFetching || !pool?.length) return null;
    return (
        <Suspense fallback={null}>
            <Reel pool={pool} onDone={onDone} onClose={close} />
        </Suspense>
    );
};

/** The dice button that starts a pick. */
export const SurpriseButton: FC<{ className?: string; showLabel?: boolean }> = ({ className, showLabel }) => (
    <button
        type='button'
        className={className}
        onClick={() => window.dispatchEvent(new Event(SURPRISE_EVENT))}
        aria-label={globalize.translate('CinemaSurpriseMe')}
        title={globalize.translate('CinemaSurpriseMe')}
    >
        <Casino fontSize={showLabel ? 'medium' : 'small'} className='cinema-dice' />
        {showLabel && <span className='cinema-navlink__label'>{globalize.translate('CinemaSurpriseMe')}</span>}
    </button>
);
