import React from 'react';
import { Navigate, RouteObject } from 'react-router-dom';

import { ASYNC_PUBLIC_ROUTES, ASYNC_USER_ROUTES } from 'apps/modern/routes/asyncRoutes';
import { LEGACY_PUBLIC_ROUTES, LEGACY_USER_ROUTES } from 'apps/modern/routes/legacyRoutes';
import VideoPage from 'apps/modern/routes/video';
import ConnectionRequired from 'components/ConnectionRequired';
import { type AsyncRoute, toAsyncPageRoute } from 'components/router/AsyncRoute';
import { toViewManagerPageRoute } from 'components/router/LegacyRoute';
import ErrorBoundary from 'components/router/ErrorBoundary';
import FallbackRoute from 'components/router/FallbackRoute';
import { AppType } from 'constants/appType';

/** Pages the cinema app draws itself. Everything else falls back to the modern app's pages. */
const CINEMA_USER_ROUTES: AsyncRoute[] = [
    { path: 'home', type: AppType.Cinema },
    { path: 'details', type: AppType.Cinema },
    { path: 'movies', type: AppType.Cinema },
    { path: 'tv', page: 'shows', type: AppType.Cinema }
];

const cinemaPaths = new Set(CINEMA_USER_ROUTES.map(route => route.path));

export const APP_ROUTES: RouteObject[] = [
    {
        path: '/*',
        lazy: () => import('../AppLayout'),
        children: [
            { index: true, element: <Navigate replace to='/home' /> },

            {
                /* User routes */
                Component: ConnectionRequired,
                children: [
                    ...CINEMA_USER_ROUTES.map(toAsyncPageRoute),
                    ...ASYNC_USER_ROUTES
                        .filter(route => !cinemaPaths.has(route.path))
                        .map(toAsyncPageRoute),
                    ...LEGACY_USER_ROUTES
                        .filter(route => !cinemaPaths.has(route.path))
                        .map(toViewManagerPageRoute),

                    // The video page combines new controls with the legacy player view
                    {
                        path: 'video',
                        Component: VideoPage
                    }
                ],
                ErrorBoundary
            },

            {
                /* Public routes */
                element: <ConnectionRequired level='public' />,
                children: [
                    ...ASYNC_PUBLIC_ROUTES.map(toAsyncPageRoute),
                    ...LEGACY_PUBLIC_ROUTES.map(toViewManagerPageRoute),

                    /* Fallback route for invalid paths */
                    {
                        path: '*',
                        Component: FallbackRoute
                    }
                ]
            }
        ]
    }
];
