import classNames from 'classnames';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ThemeCss from 'components/ThemeCss';
import layoutManager from 'components/layoutManager';
import { useApi } from 'hooks/useApi';
import { LibraryProvider } from 'apps/modern/features/libraries/hooks/useLibrary';

import { CinemaRail, CinemaTopNav } from './components/CinemaNav';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';

import './cinema.scss';

/** Pages that draw their own full-bleed artwork under the nav. */
const FULL_BLEED_PATHS = new Set([ '/home' ]);
/** Pages where the nav is hidden entirely. */
const NO_NAV_PATHS = new Set([ '/video', '/login', '/selectserver', '/addserver', '/forgotpassword' ]);

export const Component = () => {
    const { user } = useApi();
    const location = useLocation();
    const isTv = layoutManager.cinemaTv;

    useSpatialNavigation(isTv);

    const showNav = Boolean(user) && !NO_NAV_PATHS.has(location.pathname);
    const isFullBleed = FULL_BLEED_PATHS.has(location.pathname);

    return (
        <LibraryProvider>
            <div className={classNames('cinema-app', { 'cinema-app--tv': isTv })}>
                {showNav && (isTv ? <CinemaRail /> : <CinemaTopNav />)}

                <main
                    className={classNames('cinema-main', {
                        'cinema-main--offset': showNav && !isFullBleed
                    })}
                >
                    <AppBody>
                        <Outlet />
                    </AppBody>
                </main>

                <ThemeCss />
                <CustomCss />
            </div>
        </LibraryProvider>
    );
};
