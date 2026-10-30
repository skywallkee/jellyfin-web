import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { Fragment, useCallback } from 'react';

import { CINEMA_THEMES, type CinemaThemeId, useCinemaSettings } from 'apps/cinema/utils/settings';
import { appHost } from 'components/apphost';
import { AppFeature } from 'constants/appFeature';
import { LayoutMode } from 'constants/layoutMode';
import globalize from 'lib/globalize';

import { useScreensavers } from '../hooks/useScreensavers';
import type { DisplaySettingsValues } from '../types/displaySettingsValues';

interface DisplayPreferencesProps {
    onChange: (event: SelectChangeEvent | React.SyntheticEvent) => void;
    values: DisplaySettingsValues;
}

export function DisplayPreferences({ onChange, values }: Readonly<DisplayPreferencesProps>) {
    const { screensavers } = useScreensavers();
    const [ cinemaSettings, updateCinemaSettings ] = useCinemaSettings();

    const onCinemaThemeChange = useCallback((event: SelectChangeEvent<CinemaThemeId>) => {
        updateCinemaSettings({ theme: event.target.value as CinemaThemeId });
    }, [ updateCinemaSettings ]);

    return (
        <Stack spacing={3}>
            <Typography variant='h2'>{globalize.translate('Display')}</Typography>

            { appHost.supports(AppFeature.DisplayMode) && (
                <FormControl fullWidth>
                    <InputLabel id='display-settings-layout-label'>{globalize.translate('LabelDisplayMode')}</InputLabel>
                    <Select
                        aria-describedby='display-settings-layout-description'
                        inputProps={{
                            name: 'layout'
                        }}
                        labelId='display-settings-layout-label'
                        onChange={onChange}
                        value={values.layout}
                    >
                        <MenuItem value={LayoutMode.Auto}>{globalize.translate('Auto')}</MenuItem>
                        <MenuItem value={LayoutMode.Cinema}>{globalize.translate('LayoutCinema')}</MenuItem>
                        <MenuItem value={LayoutMode.CinemaTv}>{globalize.translate('LayoutCinemaTv')}</MenuItem>
                    </Select>
                    <FormHelperText component={Stack} id='display-settings-layout-description'>
                        <span>{globalize.translate('DisplayModeHelp')}</span>
                        <span>{globalize.translate('LabelPleaseRestart')}</span>
                    </FormHelperText>
                </FormControl>
            ) }

            { /* Cinema's own themes; the choice applies straight away, like the swatches in Cinema settings */ }
            <FormControl fullWidth>
                <InputLabel id='display-settings-theme-label'>{globalize.translate('LabelTheme')}</InputLabel>
                <Select
                    aria-describedby='display-settings-theme-description'
                    labelId='display-settings-theme-label'
                    onChange={onCinemaThemeChange}
                    value={cinemaSettings.theme}
                >
                    { ...CINEMA_THEMES.map(({ id, labelKey }) => (
                        <MenuItem key={id} value={id}>{globalize.translate(labelKey)}</MenuItem>
                    ))}
                </Select>
                <FormHelperText id='display-settings-theme-description'>
                    {globalize.translate('CinemaThemeHelp')}
                </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
                <FormControlLabel
                    aria-describedby='display-settings-disable-css-description'
                    control={
                        <Checkbox
                            checked={values.disableCustomCss}
                            onChange={onChange}
                        />
                    }
                    label={globalize.translate('DisableCustomCss')}
                    name='disableCustomCss'
                />
                <FormHelperText id='display-settings-disable-css-description'>
                    {globalize.translate('LabelDisableCustomCss')}
                </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
                <TextField
                    aria-describedby='display-settings-custom-css-description'
                    value={values.customCss}
                    label={globalize.translate('LabelCustomCss')}
                    multiline
                    name='customCss'
                    onChange={onChange}
                />
                <FormHelperText id='display-settings-custom-css-description'>
                    {globalize.translate('LabelLocalCustomCss')}
                </FormHelperText>
            </FormControl>

            { screensavers.length > 0 && appHost.supports(AppFeature.Screensaver) && (
                <Fragment>
                    <FormControl fullWidth>
                        <InputLabel id='display-settings-screensaver-label'>{globalize.translate('LabelScreensaver')}</InputLabel>
                        <Select
                            inputProps={{
                                name: 'screensaver'
                            }}
                            labelId='display-settings-screensaver-label'
                            onChange={onChange}
                            value={values.screensaver}
                        >
                            { ...screensavers.map(({ id, name }) => (
                                <MenuItem key={id} value={id}>{name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <TextField
                            aria-describedby='display-settings-screensaver-time-description'
                            value={values.screensaverTime}
                            label={globalize.translate('LabelScreensaverTime')}
                            name='screensaverTime'
                            onChange={onChange}
                            slotProps={{
                                htmlInput: {
                                    inputMode: 'numeric',
                                    max: '3600',
                                    min: '1',
                                    pattern: '[0-9]',
                                    required: true,
                                    step: '1',
                                    type: 'number'
                                }
                            }}
                        />
                        <FormHelperText id='display-settings-screensaver-time-description'>
                            {globalize.translate('LabelScreensaverTimeHelp')}
                        </FormHelperText>
                    </FormControl>

                    <FormControl fullWidth>
                        <TextField
                            aria-describedby='display-settings-backdrop-screensaver-interval-description'
                            value={values.backdropScreensaverInterval}
                            label={globalize.translate('LabelBackdropScreensaverInterval')}
                            name='backdropScreensaverInterval'
                            onChange={onChange}
                            slotProps={{
                                htmlInput: {
                                    inputMode: 'numeric',
                                    max: '3600',
                                    min: '1',
                                    pattern: '[0-9]',
                                    required: true,
                                    step: '1',
                                    type: 'number'
                                }
                            }}
                        />
                        <FormHelperText id='display-settings-backdrop-screensaver-interval-description'>
                            {globalize.translate('LabelBackdropScreensaverIntervalHelp')}
                        </FormHelperText>
                    </FormControl>
                </Fragment>
            ) }

            <FormControl fullWidth>
                <TextField
                    aria-describedby='display-settings-slideshow-interval-description'
                    value={values.slideshowInterval}
                    label={globalize.translate('LabelSlideshowInterval')}
                    name='slideshowInterval'
                    onChange={onChange}
                    slotProps={{
                        htmlInput: {
                            inputMode: 'numeric',
                            max: '3600',
                            min: '1',
                            pattern: '[0-9]',
                            required: true,
                            step: '1',
                            type: 'number'
                        }
                    }}
                />
                <FormHelperText id='display-settings-slideshow-interval-description'>
                    {globalize.translate('LabelSlideshowIntervalHelp')}
                </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
                <FormControlLabel
                    aria-describedby='display-settings-faster-animations-description'
                    control={
                        <Checkbox
                            checked={values.enableFasterAnimation}
                            onChange={onChange}
                        />
                    }
                    label={globalize.translate('EnableFasterAnimations')}
                    name='enableFasterAnimation'
                />
                <FormHelperText id='display-settings-faster-animations-description'>
                    {globalize.translate('EnableFasterAnimationsHelp')}
                </FormHelperText>
            </FormControl>

            <FormControl fullWidth>
                <FormControlLabel
                    aria-describedby='display-settings-blurhash-description'
                    control={
                        <Checkbox
                            checked={values.enableBlurHash}
                            onChange={onChange}
                        />
                    }
                    label={globalize.translate('EnableBlurHash')}
                    name='enableBlurHash'
                />
                <FormHelperText id='display-settings-blurhash-description'>
                    {globalize.translate('EnableBlurHashHelp')}
                </FormHelperText>
            </FormControl>
        </Stack>
    );
}
