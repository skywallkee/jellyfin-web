import classNames from 'classnames';
import React, { type FC } from 'react';

import layoutManager from 'components/layoutManager';
import { LayoutMode } from 'constants/layoutMode';
import globalize from 'lib/globalize';

import { playSound } from '../utils/sounds';
import { areSoundsEnabled, type CinemaThemeId, useCinemaSettings } from '../utils/settings';

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

const onLayoutChange = (mode: LayoutMode, currentLayout: LayoutMode) => {
    if (mode === currentLayout) return;
    layoutManager.setLayout(mode);
    // The app picks its layout at startup, so reload to switch
    window.location.reload();
};

/** Cinema's own options: theme, video previews, transparency, finish, sounds, screensaver and layout. Used in the panel and on the settings page. */
const CinemaSettingsControls: FC = () => {
    const [ settings, updateSettings ] = useCinemaSettings();
    const currentLayout = layoutManager.cinemaTv ? LayoutMode.CinemaTv : LayoutMode.Cinema;

    return (
        <>
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
            <Toggle
                label={globalize.translate('CinemaFilmGrain')}
                help={globalize.translate('CinemaFilmGrainHelp')}
                checked={settings.filmGrain}
                onChange={filmGrain => updateSettings({ filmGrain })}
            />
            <Toggle
                label={globalize.translate('CinemaInterfaceSounds')}
                help={globalize.translate('CinemaInterfaceSoundsHelp')}
                checked={areSoundsEnabled(settings)}
                onChange={interfaceSounds => {
                    updateSettings({ interfaceSounds });
                    // Let the user hear what they turned on
                    playSound('select');
                }}
            />
            <Toggle
                label={globalize.translate('CinemaThemeMusic')}
                help={globalize.translate('CinemaThemeMusicHelp')}
                checked={settings.themeMusic}
                onChange={themeMusic => updateSettings({ themeMusic })}
            />
            <Toggle
                label={globalize.translate('LabelScreensaver')}
                help={globalize.translate('CinemaScreensaverHelp')}
                checked={settings.screensaver}
                onChange={screensaver => updateSettings({ screensaver })}
            />

            <h3 className='cinema-settings__label'>{globalize.translate('LabelDisplayMode')}</h3>
            <div className='cinema-chipgroup cinema-settings__layouts'>
                {LAYOUTS.map(layout => (
                    <button
                        key={layout.mode}
                        type='button'
                        className={classNames('cinema-season cinema-focusable', { 'is-active': layout.mode === currentLayout })}
                        aria-pressed={layout.mode === currentLayout}
                        onClick={() => onLayoutChange(layout.mode, currentLayout)}
                    >
                        {globalize.translate(layout.labelKey)}
                    </button>
                ))}
            </div>
        </>
    );
};

export default CinemaSettingsControls;
