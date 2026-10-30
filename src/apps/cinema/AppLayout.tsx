import classNames from 'classnames';
import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ThemeCss from 'components/ThemeCss';
import layoutManager from 'components/layoutManager';
import { useApi } from 'hooks/useApi';
import { LibraryProvider } from 'apps/modern/features/libraries/hooks/useLibrary';

import AmbientLayer from './components/AmbientLayer';
import CinemaThemeRoot from './components/CinemaThemeRoot';
import { CinemaRail, CinemaTopNav } from './components/CinemaNav';
import { HoverPreviewProvider } from './components/HoverPreview';
import IntroSplash from './components/IntroSplash';
import QuickSearch from './components/QuickSearch';
import Screensaver from './components/Screensaver';
import ShortcutsOverlay from './components/ShortcutsOverlay';
import { SurpriseMe } from './components/SurpriseMe';
import SettingsBackBar, { SETTINGS_SUBPAGES } from './components/SettingsBackBar';
import DetailsModal from './features/details/DetailsModal';
import EndScreen from './features/endscreen/EndScreen';
import { useJoinFromInvite } from './features/party/WatchTogether';
import PlayerExtras from './features/player/PlayerExtras';
import { useCursorGlow } from './hooks/useCursorGlow';
import { ItemLinkProvider } from './hooks/useItemLink';
import { useIdlePrefetch, useScrollingFlag } from './hooks/usePerformance';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { setFocusTint, useGlowVars } from './utils/ambient';
import { setSoundsOnByDefault, useCinemaSettings } from './utils/settings';

import './cinema.scss';
import './styles/motion.scss';
import './styles/settings-page.scss';
import './styles/legacy-skin.scss';
import './styles/experience.scss';
import './styles/player.scss';
import './styles/wow.scss';
import './styles/delight.scss';
import './styles/endscreen.scss';
import './styles/features.scss';
import './styles/tonight.scss';
import './styles/diary.scss';
import './styles/people-genres.scss';
import './styles/signin.scss';
import './styles/brand.scss';
import './styles/overlays.scss';
import './styles/perf.scss';

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
    useCursorGlow(!isTv);
    useScrollingFlag();
    useIdlePrefetch(Boolean(user));
    setSoundsOnByDefault(isTv);
    // Opening a watch-party invite link joins that party
    useJoinFromInvite();

    // New pages open at the top; Back (a "POP") keeps the browser's restored scroll position
    const navigationType = useNavigationType();
    useLayoutEffect(() => {
        if (navigationType !== 'POP') window.scrollTo(0, 0);
        // A card that was hovered on the previous screen shouldn't keep colouring this one
        setFocusTint();
    }, [ location.pathname, navigationType ]);

    // Glows, focus rings and progress bars pick up the colour of whatever is featured
    const appRef = useRef<HTMLDivElement>(null);
    useGlowVars(appRef);

    const showNav = Boolean(user) && !NO_NAV_PATHS.has(location.pathname);
    const isFullBleed = FULL_BLEED_PATHS.has(location.pathname);
    const hasBackBar = showNav && SETTINGS_SUBPAGES.has(location.pathname);
    const isVideo = location.pathname === '/video';

    return (
        <CinemaThemeRoot theme={settings.theme} isSolid={settings.reduceTransparency}>
            <LibraryProvider>
                <div
                    ref={appRef}
                    className={classNames('cinema-app', {
                        'cinema-app--tv': isTv,
                        'cinema-app--solid': settings.reduceTransparency,
                        // The video plays underneath the app, so the app turns see-through while it does
                        'cinema-app--video': isVideo
                    })}
                    data-cinema-theme={settings.theme}
                >
                    <AmbientLayer />
                    <ItemLinkProvider>
                        <HoverPreviewProvider>
                            {showNav && (isTv ? <CinemaRail /> : <CinemaTopNav />)}

                            <main
                                className={classNames('cinema-main', {
                                    'cinema-main--offset': showNav && !isFullBleed,
                                    'cinema-main--with-backbar': hasBackBar
                                })}
                            >
                                {hasBackBar && <SettingsBackBar />}
                                <AppBody>
                                    {/* Keyed by path so each screen plays its entrance; opening a details card (?item=) doesn't */}
                                    <div key={location.pathname} className='cinema-page'>
                                        <Outlet />
                                    </div>
                                </AppBody>
                            </main>
                            <DetailsModal />
                            {user && <QuickSearch />}
                            {user && <SurpriseMe />}
                            {user && !isTv && <ShortcutsOverlay />}
                        </HoverPreviewProvider>
                        {isVideo && user && <PlayerExtras />}
                        {/* Outside the hover previews: they'd only open underneath it */}
                        {user && <EndScreen />}
                    </ItemLinkProvider>
                    {user && <Screensaver />}
                    {user && <IntroSplash />}

                    <ThemeCss />
                    <CustomCss />
                </div>
            </LibraryProvider>
        </CinemaThemeRoot>
    );
};
