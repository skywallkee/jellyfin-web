import { ThemeProvider } from '@mui/material/styles';
import React, { type FC, type PropsWithChildren, useEffect, useMemo } from 'react';

import { CINEMA_PALETTES, createCinemaMuiTheme } from '../dashboard/dashboardTheme';
import type { CinemaThemeId } from '../utils/settings';

const ROOT_CLASS = 'cinema-root';

interface CinemaThemeRootProps {
    theme: CinemaThemeId;
    isSolid: boolean;
}

/**
 * Puts the Cinema look on everything the app shows, including what Jellyfin draws outside it:
 * Material UI controls (menus, selects, switches) get the Cinema theme, and the page root gets the
 * Cinema colours so the classic dialogs and pop-up menus added to the page body can use them.
 */
const CinemaThemeRoot: FC<PropsWithChildren<CinemaThemeRootProps>> = ({ theme, isSolid, children }) => {
    const muiTheme = useMemo(() => createCinemaMuiTheme(CINEMA_PALETTES[theme], isSolid), [ isSolid, theme ]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add(ROOT_CLASS);
        root.classList.toggle(`${ROOT_CLASS}--solid`, isSolid);
        root.dataset.cinemaTheme = theme;
        return () => {
            root.classList.remove(ROOT_CLASS, `${ROOT_CLASS}--solid`);
            delete root.dataset.cinemaTheme;
        };
    }, [ isSolid, theme ]);

    return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
};

export default CinemaThemeRoot;
