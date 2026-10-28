import ChevronRight from '@mui/icons-material/ChevronRight';
import Close from '@mui/icons-material/Close';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import Logout from '@mui/icons-material/Logout';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

import layoutManager from 'components/layoutManager';
import { LayoutMode } from 'constants/layoutMode';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import { getKeyName } from 'scripts/keyboardNavigation';
import Dashboard from 'utils/dashboard';

import { type CinemaThemeId, useCinemaSettings } from '../utils/settings';

const THEMES: { id: CinemaThemeId; labelKey: string }[] = [
    { id: 'midnight', labelKey: 'CinemaThemeMidnight' },
    { id: 'aurora', labelKey: 'CinemaThemeAurora' },
    { id: 'ember', labelKey: 'CinemaThemeEmber' },
    { id: 'emerald', labelKey: 'CinemaThemeEmerald' },
    { id: 'mono', labelKey: 'CinemaThemeMono' }
];

const LAYOUTS: { mode: LayoutMode; labelKey: string }[] = [
    { mode: LayoutMode.Cinema, labelKey: 'LayoutCinema' },
    { mode: LayoutMode.CinemaTv, labelKey: 'LayoutCinemaTv' },
    // "Auto" brings back the standard Jellyfin layout
    { mode: LayoutMode.Auto, labelKey: 'LayoutClassic' }
];

/** Keys that close the panel: Escape, Backspace, and the Back button on remotes. */
const CLOSE_KEYS = new Set([ 'Escape', 'Backspace', 'Back', 'GoBack', 'BrowserBack' ]);

interface ToggleProps {
    label: string;
    help: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const Toggle: FC<ToggleProps> = ({ label, help, checked, onChange }) => (
    <button
        type='button'
        role='switch'
        aria-checked={checked}
        className='cinema-settings__toggle cinema-focusable'
        onClick={() => onChange(!checked)}
    >
        <span className='cinema-settings__toggle-text'>
            <span>{label}</span>
            <small>{help}</small>
        </span>
        <span className={classNames('cinema-switch', { 'is-on': checked })} aria-hidden='true' />
    </button>
);

interface SettingsPanelProps {
    onClose: () => void;
    /** Where the panel sits: under the top bar, or beside the TV rail. */
    placement: 'top' | 'side';
}

/** Quick Cinema settings: theme, previews, transparency, layout, and account links. */
const SettingsPanel: FC<SettingsPanelProps> = ({ onClose, placement }) => {
    const { user } = useApi();
    const [ settings, updateSettings ] = useCinemaSettings();
    const panelRef = useRef<HTMLElement>(null);
    const location = useLocation();
    const initialPath = useRef(location.pathname + location.search);
    const currentLayout = layoutManager.cinemaTv ? LayoutMode.CinemaTv : LayoutMode.Cinema;

    // Start with focus on the selected theme so keyboard and remote users land inside the panel
    useEffect(() => {
        panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    }, []);

    // Close on Escape, on a click outside, or when a link inside navigates away
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // getKeyName also maps TV remotes' numeric Back codes (webOS, Tizen) to 'Back'
            if (!CLOSE_KEYS.has(getKeyName(e))) return;
            // Handled before the app's own Back handling, so Back closes the panel instead of leaving the page
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!panelRef.current?.contains(target) && !target.closest('[data-cinema-settings-toggle]')) onClose();
        };
        window.addEventListener('keydown', onKeyDown, { capture: true });
        window.addEventListener('pointerdown', onPointerDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown, { capture: true });
            window.removeEventListener('pointerdown', onPointerDown);
        };
    }, [ onClose ]);

    useEffect(() => {
        if (location.pathname + location.search !== initialPath.current) onClose();
    }, [ location.pathname, location.search, onClose ]);

    const onLayoutChange = (mode: LayoutMode) => {
        if (mode === currentLayout) return;
        layoutManager.setLayout(mode);
        // The app picks its layout at startup, so reload to switch
        window.location.reload();
    };

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

            <h3 className='cinema-settings__label'>{globalize.translate('LabelTheme')}</h3>
            <div className='cinema-settings__themes'>
                {THEMES.map(theme => (
                    <button
                        key={theme.id}
                        type='button'
                        className={classNames('cinema-swatch cinema-focusable', { 'is-active': settings.theme === theme.id })}
                        aria-pressed={settings.theme === theme.id}
                        onClick={() => updateSettings({ theme: theme.id })}
                    >
                        <span className='cinema-swatch__dot' data-swatch={theme.id} aria-hidden='true' />
                        {globalize.translate(theme.labelKey)}
                    </button>
                ))}
            </div>

            <Toggle
                label={globalize.translate('CinemaVideoPreviews')}
                help={globalize.translate('CinemaVideoPreviewsHelp')}
                checked={settings.videoPreviews}
                onChange={videoPreviews => updateSettings({ videoPreviews })}
            />
            <Toggle
                label={globalize.translate('CinemaReduceTransparency')}
                help={globalize.translate('CinemaReduceTransparencyHelp')}
                checked={settings.reduceTransparency}
                onChange={reduceTransparency => updateSettings({ reduceTransparency })}
            />

            <h3 className='cinema-settings__label'>{globalize.translate('LabelDisplayMode')}</h3>
            <div className='cinema-chipgroup cinema-settings__layouts'>
                {LAYOUTS.map(layout => (
                    <button
                        key={layout.mode}
                        type='button'
                        className={classNames('cinema-season cinema-focusable', { 'is-active': layout.mode === currentLayout })}
                        aria-pressed={layout.mode === currentLayout}
                        onClick={() => onLayoutChange(layout.mode)}
                    >
                        {globalize.translate(layout.labelKey)}
                    </button>
                ))}
            </div>

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
