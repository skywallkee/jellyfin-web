import HomeOutlined from '@mui/icons-material/HomeOutlined';
import Search from '@mui/icons-material/Search';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import classNames from 'classnames';
import React, { type FC, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import LibraryIcon from 'apps/modern/components/LibraryIcon';
import { appRouter } from 'components/router/appRouter';
import { useApi } from 'hooks/useApi';
import { useUserViews } from 'hooks/api/useUserViews';
import globalize from 'lib/globalize';

/** Libraries shown before the rest are cut off in the top bar. */
const MAX_TOP_BAR_LIBRARIES = 5;

interface NavLink {
    key: string;
    label: string;
    to: string;
    icon: React.ReactNode;
    isActive: boolean;
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
            icon: <LibraryIcon item={view} />,
            isActive: topParentId !== null && view.Id === topParentId
        }));

        return [
            {
                key: 'home',
                label: globalize.translate('Home'),
                to: '/home',
                icon: <HomeOutlined />,
                isActive: location.pathname === '/home'
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

/** Floating glass bar across the top, used on desktop. */
export const CinemaTopNav: FC = () => {
    const links = useNavLinks();
    const location = useLocation();

    return (
        <nav className='cinema-topnav cinema-glass' aria-label={globalize.translate('HeaderNavigation')}>
            <Link className='cinema-brand' to='/home' tabIndex={-1}>
                <span className='cinema-brand__mark' aria-hidden='true' />
                Jellyfin
            </Link>
            <div className='cinema-topnav__links'>
                {links.slice(0, MAX_TOP_BAR_LIBRARIES + 1).map(link => (
                    <Link
                        key={link.key}
                        to={link.to}
                        className={classNames('cinema-navlink cinema-focusable', { 'is-active': link.isActive })}
                        aria-current={link.isActive ? 'page' : undefined}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
            <span className='cinema-topnav__divider' aria-hidden='true' />
            <Link
                className={classNames('cinema-iconbtn cinema-focusable', { 'is-active': location.pathname === '/search' })}
                to='/search'
                aria-label={globalize.translate('Search')}
            >
                <Search fontSize='small' />
            </Link>
            <Link
                className='cinema-iconbtn cinema-focusable'
                to='/mypreferencesmenu'
                aria-label={globalize.translate('Settings')}
            >
                <SettingsOutlined fontSize='small' />
            </Link>
            <UserAvatar />
        </nav>
    );
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
        ...links.slice(1),
        {
            key: 'settings',
            label: globalize.translate('Settings'),
            to: '/mypreferencesmenu',
            icon: <SettingsOutlined />,
            isActive: location.pathname.startsWith('/mypreferences')
        }
    ].filter(Boolean);

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
        </nav>
    );
};
