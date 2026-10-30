import { createTheme } from '@mui/material/styles';

import { DEFAULT_THEME_OPTIONS } from './_base/theme';
import dark from './dark';

/** The default theme containing all color scheme variants. */
const DEFAULT_THEME = createTheme({
    cssVariables: {
        cssVarPrefix: 'jf',
        colorSchemeSelector: '[data-theme="%s"]',
        disableCssColorScheme: true
    },
    defaultColorScheme: 'dark',
    ...DEFAULT_THEME_OPTIONS,
    // Only the dark base is kept: Cinema has its own themes (Midnight, Aurora, Ember, Emerald, Mono)
    colorSchemes: {
        dark
    }
});

export default DEFAULT_THEME;
