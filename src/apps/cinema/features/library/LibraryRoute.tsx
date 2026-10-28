import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { type FC, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

import LibraryView from './LibraryView';

const FALLBACK_PAGES = {
    movies: lazy(() => import('apps/modern/routes/movies')),
    shows: lazy(() => import('apps/modern/routes/shows'))
};

interface LibraryRouteProps {
    itemTypes: BaseItemKind[];
    /** The modern page to show when the URL doesn't name a library. */
    fallbackPage: keyof typeof FALLBACK_PAGES;
}

const LibraryRoute: FC<LibraryRouteProps> = ({ itemTypes, fallbackPage }) => {
    const [ searchParams ] = useSearchParams();
    const parentId = searchParams.get('topParentId') ?? searchParams.get('parentId');

    if (!parentId) {
        const Fallback = FALLBACK_PAGES[fallbackPage];
        return (
            <Suspense fallback={null}>
                <Fallback />
            </Suspense>
        );
    }

    // Keyed by library so scroll position and paging reset when switching libraries
    return <LibraryView key={parentId} parentId={parentId} itemTypes={itemTypes} />;
};

export default LibraryRoute;
