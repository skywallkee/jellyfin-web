import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import Logout from '@mui/icons-material/Logout';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import Dashboard from 'utils/dashboard';

import { useOverlay } from '../hooks/useOverlay';

import CinemaSettingsControls from './CinemaSettingsControls';

interface SettingsPanelProps {
    onClose: () => void;
    /** Where the panel sits: under the top bar, or beside the TV rail. */
    placement: 'top' | 'side';
}

/** Quick Cinema settings: theme, previews, transparency, layout, and account links. */
const SettingsPanel: FC<SettingsPanelProps> = ({ onClose, placement }) => {
    const { user } = useApi();
    const panelRef = useRef<HTMLElement>(null);
    const location = useLocation();
    const initialPath = useRef(location.pathname + location.search);

    // Start with focus on the selected theme so keyboard and remote users land inside the panel
    useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    }, []);

    // Escape / Back close the panel (as the top overlay), before the app's own Back handling
    useOverlay(true, onClose);

    // Close on a click outside, or when a link inside navigates away
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!panelRef.current?.contains(target) && !target.closest('[data-cinema-settings-toggle]')) onClose();
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [ onClose ]);

    useEffect(() => {
        if (location.pathname + location.search !== initialPath.current) onClose();
    }, [ location.pathname, location.search, onClose ]);

    return (
        <section
            ref={panelRef}
            className={classNames('cinema-settings cinema-glass', `cinema-settings--${placement}`)}
            aria-label={globalize.translate('Settings')}
        >
            <header className='cinema-settings__header'>
                <h2>{globalize.translate('Settings')}</h2>
                <button
                    type='button'
                    className='cinema-iconbtn cinema-focusable'
                    onClick={onClose}
                    aria-label={globalize.translate('ButtonClose')}
                >
                    <Close fontSize='small' />
                </button>
            </header>

            <CinemaSettingsControls />

            <nav className='cinema-settings__links'>
                <Link to='/mypreferencesmenu' className='cinema-settings__link cinema-focusable'>
                    <SettingsOutlined fontSize='small' />
                    {globalize.translate('CinemaAllSettings')}
                    <ChevronRight fontSize='small' className='cinema-settings__chevron' />
                </Link>
                {user?.Policy?.IsAdministrator && (
                    <Link to='/dashboard' className='cinema-settings__link cinema-focusable'>
                        <DashboardOutlined fontSize='small' />
                        {globalize.translate('TabDashboard')}
                        <ChevronRight fontSize='small' className='cinema-settings__chevron' />
                    </Link>
                )}
                <button
                    type='button'
                    className='cinema-settings__link cinema-focusable'
                    onClick={() => Dashboard.logout()}
                >
                    <Logout fontSize='small' />
                    {globalize.translate('ButtonSignOut')}
                </button>
            </nav>
        </section>
    );
};

export default SettingsPanel;
