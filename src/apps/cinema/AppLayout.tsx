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
import { HoverPreviewProvider } from './components/HoverPreview';
import DetailsModal from './features/details/DetailsModal';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { useCinemaSettings } from './utils/settings';

import './cinema.scss';
import './styles/motion.scss';
import './styles/settings-page.scss';
import './styles/legacy-skin.scss';

/** Pages that draw their own full-bleed artwork under the nav. */
const FULL_BLEED_PATHS = new Set([ '/home' ]);
/** Pages where the nav is hidden entirely. */
const NO_NAV_PATHS = new Set([ '/video', '/login', '/selectserver', '/addserver', '/forgotpassword' ]);

export const Component = () => {
    const { user } = useApi();
    const location = useLocation();
    const isTv = layoutManager.cinemaTv;
    const [ settings ] = useCinemaSettings();

    useSpatialNavigation(isTv);

    const showNav = Boolean(user) && !NO_NAV_PATHS.has(location.pathname);
    const isFullBleed = FULL_BLEED_PATHS.has(location.pathname);

    return (
        <LibraryProvider>
            <div
                className={classNames('cinema-app', {
                    'cinema-app--tv': isTv,
                    'cinema-app--solid': settings.reduceTransparency
                })}
                data-cinema-theme={settings.theme}
            >
                <HoverPreviewProvider>
                    {showNav && (isTv ? <CinemaRail /> : <CinemaTopNav />)}

                    <main
                        className={classNames('cinema-main', {
                            'cinema-main--offset': showNav && !isFullBleed
                        })}
                    >
                        <AppBody>
                            {/* Keyed by path so each screen plays its entrance; opening a details card (?item=) doesn't */}
                            <div key={location.pathname} className='cinema-page'>
                                <Outlet />
                            </div>
                        </AppBody>
                    </main>
                    <DetailsModal />
                </HoverPreviewProvider>

                <ThemeCss />
                <CustomCss />
            </div>
        </LibraryProvider>
    );
};
