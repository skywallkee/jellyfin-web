import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ClosedCaptionOutlined from '@mui/icons-material/ClosedCaptionOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DesktopWindowsOutlined from '@mui/icons-material/DesktopWindowsOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import ExitToApp from '@mui/icons-material/ExitToApp';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import Logout from '@mui/icons-material/Logout';
import PhonelinkLockOutlined from '@mui/icons-material/PhonelinkLockOutlined';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import SettingsApplicationsOutlined from '@mui/icons-material/SettingsApplicationsOutlined';
import SportsEsportsOutlined from '@mui/icons-material/SportsEsportsOutlined';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import React, { type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { appHost } from 'components/apphost';
import layoutManager from 'components/layoutManager';
import { AppFeature } from 'constants/appFeature';
import { useApi } from 'hooks/useApi';
import { useQuickConnectEnabled } from 'hooks/useQuickConnect';
import globalize from 'lib/globalize';
import browser from 'scripts/browser';
import keyboardNavigation from 'scripts/keyboardNavigation';
import shell from 'scripts/shell';
import Dashboard from 'utils/dashboard';

import CinemaSettingsControls from '../components/CinemaSettingsControls';
import { useHideLegacyView } from '../hooks/useHideLegacyView';

interface Tile {
    key: string;
    labelKey: string;
    icon: ReactNode;
    /** A page to open, or an action to run. */
    to?: string;
    onClick?: () => void;
}

const TileButton: FC<{ tile: Tile; index: number }> = ({ tile, index }) => {
    const content = (
        <>
            <span className='cinema-tile__icon' aria-hidden='true'>{tile.icon}</span>
            <span className='cinema-tile__label'>{globalize.translate(tile.labelKey)}</span>
            {tile.to && <ChevronRight className='cinema-tile__chevron' aria-hidden='true' />}
        </>
    );
    // Stagger the entrance so the grid builds up tile by tile
    const style = { animationDelay: `${index * 35}ms` };

    if (tile.to) {
        return <Link to={tile.to} className='cinema-tile cinema-glass cinema-focusable' style={style}>{content}</Link>;
    }
    return (
        <button type='button' className='cinema-tile cinema-glass cinema-focusable' style={style} onClick={tile.onClick}>
            {content}
        </button>
    );
};

const TileSection: FC<{ titleKey?: string; tiles: (Tile | false)[]; offset?: number }> = ({ titleKey, tiles, offset = 0 }) => {
    const visible = tiles.filter((tile): tile is Tile => Boolean(tile));
    if (!visible.length) return null;
    return (
        <section className='cinema-settingspage__section'>
            {titleKey && <h2 className='cinema-settingspage__heading'>{globalize.translate(titleKey)}</h2>}
            <div className='cinema-tiles'>
                {visible.map((tile, i) => <TileButton key={tile.key} tile={tile} index={offset + i} />)}
            </div>
        </section>
    );
};

const Settings: FC = () => {
    useHideLegacyView(true, globalize.translate('Settings'));
    const { api, user } = useApi();
    const { data: isQuickConnectEnabled } = useQuickConnectEnabled();
    const userId = user?.Id;
    const query = userId ? `?userId=${userId}` : '';
    // Same rules as the standard settings page
    const isControlsPageEmpty = !keyboardNavigation.canEnableGamepad() && !layoutManager.tv;
    const isAdmin = Boolean(user?.Policy?.IsAdministrator) && !layoutManager.cinemaTv;
    const avatarUrl = api && userId && user?.PrimaryImageTag ?
        `${api.basePath}/Users/${userId}/Images/Primary?tag=${user.PrimaryImageTag}&maxWidth=240` :
        undefined;

    const preferenceTiles: (Tile | false)[] = [
        { key: 'stats', labelKey: 'CinemaYourCinema', icon: <InsightsOutlined />, to: '/cinemastats' },
        { key: 'history', labelKey: 'CinemaHistory', icon: <HistoryOutlined />, to: '/history' },
        { key: 'comingsoon', labelKey: 'CinemaComingSoon', icon: <EventOutlined />, to: '/comingsoon' },
        { key: 'diary', labelKey: 'CinemaDiary', icon: <MenuBookOutlined />, to: '/diary' },
        { key: 'profile', labelKey: 'Profile', icon: <AccountCircleOutlined />, to: `/userprofile${query}` },
        { key: 'display', labelKey: 'Display', icon: <DesktopWindowsOutlined />, to: `/mypreferencesdisplay${query}` },
        { key: 'home', labelKey: 'Home', icon: <HomeOutlined />, to: `/mypreferenceshome${query}` },
        { key: 'playback', labelKey: 'TitlePlayback', icon: <PlayCircleOutline />, to: `/mypreferencesplayback${query}` },
        { key: 'subtitles', labelKey: 'Subtitles', icon: <ClosedCaptionOutlined />, to: `/mypreferencessubtitles${query}` },
        !browser.mobile && !isControlsPageEmpty && {
            key: 'controls', labelKey: 'Controls', icon: <SportsEsportsOutlined />, to: `/mypreferencescontrols${query}`
        },
        Boolean(isQuickConnectEnabled) && {
            key: 'quickconnect', labelKey: 'QuickConnect', icon: <PhonelinkLockOutlined />, to: `/quickconnect${query}`
        },
        appHost.supports(AppFeature.DownloadManagement) && {
            key: 'downloads', labelKey: 'DownloadManager', icon: <DownloadOutlined />, onClick: shell.openDownloadManager
        },
        appHost.supports(AppFeature.ClientSettings) && {
            key: 'client', labelKey: 'ClientSettings', icon: <SettingsApplicationsOutlined />, onClick: shell.openClientSettings
        }
    ];

    const adminTiles: Tile[] = !isAdmin ? [] : [
        { key: 'dashboard', labelKey: 'TabDashboard', icon: <DashboardOutlined />, to: '/dashboard' },
        { key: 'metadata', labelKey: 'MetadataManager', icon: <EditNoteOutlined />, to: '/metadata' }
    ];

    const accountTiles: (Tile | false)[] = [
        appHost.supports(AppFeature.MultiServer) && {
            key: 'server', labelKey: 'SelectServer', icon: <StorageOutlined />, onClick: Dashboard.selectServer
        },
        { key: 'signout', labelKey: 'ButtonSignOut', icon: <Logout />, onClick: Dashboard.logout },
        appHost.supports(AppFeature.ExitMenu) && {
            key: 'exit', labelKey: 'ButtonExitApp', icon: <ExitToApp />, onClick: appHost.exit
        }
    ];

    return (
        <div className='cinema-settingspage'>
            <header className='cinema-settingspage__header'>
                <span className='cinema-avatar cinema-settingspage__avatar'>
                    {avatarUrl ? <img src={avatarUrl} alt='' /> : (user?.Name ?? '?').slice(0, 2).toUpperCase()}
                </span>
                <div>
                    <p className='cinema-settingspage__eyebrow'>{globalize.translate('Settings')}</p>
                    <h1 className='cinema-library__title'>{user?.Name}</h1>
                </div>
            </header>

            <section className='cinema-settingspage__section'>
                <h2 className='cinema-settingspage__heading'>{globalize.translate('LayoutCinema')}</h2>
                <div className='cinema-settingspage__cinema cinema-glass'>
                    <CinemaSettingsControls />
                </div>
            </section>

            <TileSection titleKey='HeaderUser' tiles={preferenceTiles} />
            <TileSection titleKey='HeaderAdmin' tiles={adminTiles} offset={preferenceTiles.length} />
            <TileSection tiles={accountTiles} offset={preferenceTiles.length + 2} />
        </div>
    );
};

export default Settings;
