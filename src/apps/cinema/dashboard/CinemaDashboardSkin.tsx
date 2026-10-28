import { ThemeProvider } from '@mui/material/styles';
import React, { type FC, type PropsWithChildren, useEffect, useMemo } from 'react';

import layoutManager from 'components/layoutManager';

import { useCinemaSettings } from '../utils/settings';

import { CINEMA_PALETTES, createCinemaDashboardTheme } from './dashboardTheme';

import './dashboard.scss';

const BODY_CLASS = 'cinema-dashboard';

/** Sets the Cinema colours on the page body, for the dashboard's classic (non-React) pages. */
const useBodyTokens = (themeId: keyof typeof CINEMA_PALETTES, isSolid: boolean) => {
    useEffect(() => {
        const body = document.body;
        const palette = CINEMA_PALETTES[themeId];
        body.classList.add(BODY_CLASS);
        body.classList.toggle(`${BODY_CLASS}--solid`, isSolid);
        body.style.setProperty('--cinema-bg', palette.bg);
        body.style.setProperty('--cinema-bg-rgb', palette.bgRgb);
        body.style.setProperty('--cinema-accent', palette.accent);
        body.style.setProperty('--cinema-accent-2', palette.accent2);
        return () => {
            body.classList.remove(BODY_CLASS, `${BODY_CLASS}--solid`);
            for (const name of [ '--cinema-bg', '--cinema-bg-rgb', '--cinema-accent', '--cinema-accent-2' ]) {
                body.style.removeProperty(name);
            }
        };
    }, [ isSolid, themeId ]);
};

const Skin: FC<PropsWithChildren> = ({ children }) => {
    const [ settings ] = useCinemaSettings();
    const theme = useMemo(
        () => createCinemaDashboardTheme(CINEMA_PALETTES[settings.theme], settings.reduceTransparency),
        [ settings.reduceTransparency, settings.theme ]
    );
    useBodyTokens(settings.theme, settings.reduceTransparency);

    return (
        <ThemeProvider theme={theme}>
            {/* The same drifting light as the main app, behind everything */}
            <div className='cinema-dash-aurora' aria-hidden='true' />
            {children}
        </ThemeProvider>
    );
};

/**
 * Dresses the admin dashboard in the Cinema look (colours, glass, shapes) when the Cinema layout
 * is in use; with any other layout the dashboard is left exactly as it was.
 */
const CinemaDashboardSkin: FC<PropsWithChildren> = ({ children }) => {
    if (layoutManager.cinema) return <Skin>{children}</Skin>;
    // Children may be several elements; the fragment keeps one return type
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
};

export default CinemaDashboardSkin;
