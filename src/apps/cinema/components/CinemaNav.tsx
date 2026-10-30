import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import Search from '@mui/icons-material/Search';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import classNames from 'classnames';
import React, { type FC, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useApi } from 'hooks/useApi';
import { useUserViews } from 'hooks/api/useUserViews';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { BRAND_NAME } from '../brand';
import { usePrefetch } from '../hooks/usePrefetch';

import BrandGlyph from './BrandGlyph';
import CinemaLibraryIcon from './CinemaLibraryIcon';
import MobileLibraryMenu from './MobileLibraryMenu';
import RequestButton from './RequestButton';
import { SurpriseButton } from './SurpriseMe';
import WatchTogether from '../features/party/WatchTogether';

// Loaded the first time settings are opened, or in the background once idle
const SettingsPanel = lazy(() => import(/* webpackChunkName: "cinema-settings-panel" */ './SettingsPanel'));

/** Libraries shown before the rest are cut off in the top bar. */
const MAX_TOP_BAR_LIBRARIES = 5;

interface NavLink {
    key: string;
    label: string;
    to: string;
    icon: React.ReactNode;
    isActive: boolean;
    /** The library behind the link, so its first page can load as the pointer arrives. */
    view?: ItemDto;
}

const useNavLinks = () => {
    const { user } = useApi();
    const location = useLocation();
    const [ searchParams ] = useSearchParams();
    const { data: userViews } = useUserViews({ userId: user?.Id });
    const topParentId = searchParams.get('topParentId') ?? searchParams.get('parentId');

    return useMemo<NavLink[]>(() => {
        const libraries = (userViews?.Items ?? []).map(view => ({
            key: view.Id ?? view.Name ?? '',
            label: view.Name ?? '',
            to: appRouter.getRouteUrl(view, { context: view.CollectionType }).substring(1),
            icon: <CinemaLibraryIcon item={view} />,
            isActive: topParentId !== null && view.Id === topParentId,
            view
        }));

        return [
            {
                key: 'home',
                label: globalize.translate('Home'),
                to: '/home',
                icon: <HomeOutlined />,
                isActive: location.pathname === '/home'
            },
            {
                key: 'mylist',
                label: globalize.translate('CinemaMyList'),
                to: '/mylist',
                icon: <BookmarkBorder />,
                isActive: location.pathname === '/mylist'
            },
            ...libraries
        ];
    }, [ location.pathname, topParentId, userViews ]);
};

const UserAvatar: FC = () => {
    const { api, user } = useApi();
    const initials = (user?.Name ?? '?').slice(0, 2).toUpperCase();
    const imageUrl = api && user?.Id && user.PrimaryImageTag ?
        `${api.basePath}/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&maxWidth=80` :
        undefined;

    return (
        <Link
            className='cinema-avatar cinema-focusable'
            to='/mypreferencesmenu'
            title={user?.Name ?? undefined}
        >
            {imageUrl ? <img src={imageUrl} alt='' /> : initials}
        </Link>
    );
};

interface PillPosition {
    left: number;
    width: number;
    isVisible: boolean;
    /** Jump straight to the position instead of sliding (e.g. when first appearing). */
    isInstant: boolean;
}

const HIDDEN_PILL: PillPosition = { left: 0, width: 0, isVisible: false, isInstant: true };

/**
 * A highlight that slides between the links of a container: to whichever link is hovered or focused,
 * and back to the current page's link when the pointer or focus leaves.
 */
const useSlidingPill = (deps: unknown[]) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [ pill, setPill ] = useState<PillPosition>(HIDDEN_PILL);

    const moveTo = useCallback((link?: HTMLElement | null) => {
        setPill(previous => {
            // No link, or one that's hidden (the phone bar keeps libraries in a menu)
            if (!link?.offsetWidth) return { ...previous, isVisible: false };
            return {
                left: link.offsetLeft,
                width: link.offsetWidth,
                isVisible: true,
                isInstant: !previous.isVisible
            };
        });
    }, []);

    const moveToActive = useCallback(() => {
        moveTo(containerRef.current?.querySelector<HTMLElement>('.is-active'));
    }, [ moveTo ]);

    useLayoutEffect(moveToActive, [ moveToActive, ...deps ]);

    useEffect(() => {
        window.addEventListener('resize', moveToActive);
        return () => window.removeEventListener('resize', moveToActive);
    }, [ moveToActive ]);

    const onPointerOrFocus = useCallback((e: React.SyntheticEvent) => {
        moveTo((e.target as HTMLElement).closest<HTMLElement>('.cinema-navlink'));
    }, [ moveTo ]);

    const onLeave = useCallback((e: React.FocusEvent | React.MouseEvent) => {
        const next = e.relatedTarget;
        if (next instanceof Node && containerRef.current?.contains(next)) return;
        moveToActive();
    }, [ moveToActive ]);

    return {
        containerRef,
        handlers: { onMouseOver: onPointerOrFocus, onFocus: onPointerOrFocus, onMouseLeave: onLeave, onBlur: onLeave },
        pillStyle: {
            width: pill.width,
            transform: `translateX(${pill.left}px)`,
            opacity: pill.isVisible ? 1 : 0,
            transition: pill.isInstant ? 'opacity 0.2s ease' : undefined
        }
    };
};

/** Pixels scrolled before the top bar switches to its compact, more solid look. */
const SCROLLED_THRESHOLD = 40;
/** Past this point, scrolling down tucks the bar away and scrolling up brings it back. */
const HIDE_THRESHOLD = 320;
/** Small scroll jitters don't flip the bar. */
const DIRECTION_SLACK = 8;

const useScrollState = () => {
    const [ state, setState ] = useState({ isScrolled: false, isHidden: false });
    useEffect(() => {
        let lastY = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            const delta = y - lastY;
            if (Math.abs(delta) < DIRECTION_SLACK && y > SCROLLED_THRESHOLD) return;
            lastY = y;
            const isScrolled = y > SCROLLED_THRESHOLD;
            const isHidden = y > HIDE_THRESHOLD && delta > 0;
            setState(previous => (
                previous.isScrolled === isScrolled && previous.isHidden === isHidden ? previous : { isScrolled, isHidden }
            ));
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return state;
};

const useSettingsPanel = () => {
    const [ isSettingsOpen, setIsSettingsOpen ] = useState(false);
    const toggleSettings = useCallback(() => setIsSettingsOpen(open => !open), []);
    const closeSettings = useCallback(() => {
        setIsSettingsOpen(false);
        // Return focus to the button that opened the panel
        document.querySelector<HTMLElement>('[data-cinema-settings-toggle]')?.focus({ preventScroll: true });
    }, []);
    return { isSettingsOpen, toggleSettings, closeSettings };
};

/** Floating glass bar across the top, used on desktop. */
export const CinemaTopNav: FC = () => {
    const { prefetchLibrary } = usePrefetch();
    const links = useNavLinks();
    const location = useLocation();
    const { containerRef, handlers, pillStyle } = useSlidingPill([ location.pathname, location.search, links ]);
    const { isSettingsOpen, toggleSettings, closeSettings } = useSettingsPanel();
    const { isScrolled, isHidden } = useScrollState();
    const isSearchPage = location.pathname === '/search';
    const isBarHidden = isHidden && !isSettingsOpen;
    const prefetchByKey = useCallback((key: string) => {
        const view = links.find(link => link.key === key)?.view;
        if (view) prefetchLibrary(view);
    }, [ links, prefetchLibrary ]);

    return (<>
        <nav
            className={classNames('cinema-topnav cinema-glass', {
                'is-scrolled': isScrolled,
                // Stays put while the settings panel is open; focus inside it brings it back via CSS
                'is-hidden': isBarHidden
            })}
            aria-label={globalize.translate('HeaderNavigation')}
        >
            <Link className='cinema-brand' to='/home' tabIndex={-1}>
                <span className='cinema-brand__mark' aria-hidden='true'><BrandGlyph /></span>
                {BRAND_NAME}
            </Link>
            <div ref={containerRef} className='cinema-topnav__links' {...handlers}>
                <span className='cinema-navpill' style={pillStyle} aria-hidden='true' />
                {links.slice(0, MAX_TOP_BAR_LIBRARIES + 1).map(link => (
                    <Link
                        key={link.key}
                        to={link.to}
                        className={classNames('cinema-navlink cinema-focusable', { 'is-active': link.isActive })}
                        aria-current={link.isActive ? 'page' : undefined}
                        onMouseEnter={link.view ? () => prefetchLibrary(link.view!) : undefined}
                        onFocus={link.view ? () => prefetchLibrary(link.view!) : undefined}
                    >
                        {/* Icons only show in the phone tab bar */}
                        <span className='cinema-navlink__icon' aria-hidden='true'>{link.icon}</span>
                        <span className='cinema-navlink__text'>{link.label}</span>
                    </Link>
                ))}
            </div>
            {/* Phones only: My List and the libraries live behind one button */}
            <MobileLibraryMenu links={links.slice(1)} isBarHidden={isBarHidden} onPrefetch={prefetchByKey} />
            <span className='cinema-topnav__divider' aria-hidden='true' />
            <RequestButton variant='bar' />
            <SurpriseButton className='cinema-iconbtn cinema-focusable cinema-topnav__surprise' />
            <WatchTogether className='cinema-iconbtn cinema-focusable' />
            <Link
                className={classNames('cinema-iconbtn cinema-focusable cinema-topnav__search', { 'is-active': isSearchPage })}
                to='/search'
                aria-label={globalize.translate('Search')}
                title={`${globalize.translate('Search')} (Ctrl+K)`}
            >
                <Search fontSize='small' />
            </Link>
            <button
                type='button'
                className={classNames('cinema-iconbtn cinema-focusable cinema-settings-toggle', { 'is-open': isSettingsOpen })}
                aria-label={globalize.translate('Settings')}
                aria-expanded={isSettingsOpen}
                data-cinema-settings-toggle
                onClick={toggleSettings}
            >
                <SettingsOutlined fontSize='small' />
            </button>
            <UserAvatar />
            {isSettingsOpen && <Suspense fallback={null}><SettingsPanel placement='top' onClose={closeSettings} /></Suspense>}
        </nav>
        {/* Phones: search floats above the tab bar's right end instead of taking a tab */}
        {!isSearchPage && (
            <Link
                className={classNames('cinema-search-fab cinema-focusable', { 'is-lowered': isBarHidden })}
                to='/search'
                aria-label={globalize.translate('Search')}
            >
                <Search />
            </Link>
        )}
    </>);
};

/** Slim icon rail on the left that expands when focused, used on TVs. */
export const CinemaRail: FC = () => {
    const links = useNavLinks();
    const location = useLocation();

    const railLinks: NavLink[] = [
        links[0],
        {
            key: 'search',
            label: globalize.translate('Search'),
            to: '/search',
            icon: <Search />,
            isActive: location.pathname === '/search'
        },
        ...links.slice(1)
    ].filter(Boolean);
    const { isSettingsOpen, toggleSettings, closeSettings } = useSettingsPanel();

    return (
        <nav className='cinema-rail cinema-glass' aria-label={globalize.translate('HeaderNavigation')}>
            {railLinks.map(link => (
                <Link
                    key={link.key}
                    to={link.to}
                    className={classNames('cinema-navlink cinema-focusable', { 'is-active': link.isActive })}
                    aria-current={link.isActive ? 'page' : undefined}
                    aria-label={link.label}
                >
                    {link.icon}
                    <span className='cinema-navlink__label'>{link.label}</span>
                </Link>
            ))}
            <RequestButton variant='rail' />
            <SurpriseButton className='cinema-navlink cinema-focusable' showLabel />
            <button
                type='button'
                className={classNames('cinema-navlink cinema-focusable', { 'is-active': isSettingsOpen })}
                aria-label={globalize.translate('Settings')}
                aria-expanded={isSettingsOpen}
                data-cinema-settings-toggle
                onClick={toggleSettings}
            >
                <SettingsOutlined />
                <span className='cinema-navlink__label'>{globalize.translate('Settings')}</span>
            </button>
            {isSettingsOpen && <Suspense fallback={null}><SettingsPanel placement='side' onClose={closeSettings} /></Suspense>}
        </nav>
    );
};
