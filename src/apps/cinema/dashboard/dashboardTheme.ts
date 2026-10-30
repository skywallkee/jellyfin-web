import { alpha, createTheme } from '@mui/material/styles';
import deepmerge from '@mui/utils/deepmerge';

import { DEFAULT_COLOR_SCHEME, DEFAULT_THEME_OPTIONS } from 'themes/_base/theme';

type CinemaThemeOptions = NonNullable<Parameters<typeof createTheme>[0]>;

import type { CinemaThemeId } from '../utils/settings';

export interface CinemaPalette {
    bg: string;
    /** The background as "r, g, b", for translucent layers. */
    bgRgb: string;
    accent: string;
    accent2: string;
}

/** The colours of each Cinema theme, matching the main app's themes. */
export const CINEMA_PALETTES: Record<CinemaThemeId, CinemaPalette> = {
    midnight: { bg: '#07080d', bgRgb: '7, 8, 13', accent: '#8ab4ff', accent2: '#c48bff' },
    aurora: { bg: '#0c0714', bgRgb: '12, 7, 20', accent: '#c48bff', accent2: '#ff7ad9' },
    ember: { bg: '#0e0806', bgRgb: '14, 8, 6', accent: '#ffab6b', accent2: '#ff5a5a' },
    emerald: { bg: '#050c0b', bgRgb: '5, 12, 11', accent: '#5de0b5', accent2: '#4cc9f0' },
    mono: { bg: '#080808', bgRgb: '8, 8, 8', accent: '#f2f2f2', accent2: '#8c8c8c' }
};

const INK = '#f4f5fa';
const GLASS_EDGE = 'rgba(255, 255, 255, 0.09)';

/**
 * A Material UI theme for the admin dashboard in Cinema's style: dark glass surfaces over the
 * theme's own colours, pill buttons, soft rounded corners and an accent that follows the Cinema theme.
 */
export const createCinemaDashboardTheme = (palette: CinemaPalette, isSolid: boolean) => {
    const surface = isSolid ? `rgb(${palette.bgRgb})` : `rgba(${palette.bgRgb}, 0.62)`;
    const raised = isSolid ? 'rgb(22, 24, 34)' : 'rgba(26, 28, 40, 0.6)';
    const blur = isSolid ? 'none' : 'blur(20px) saturate(150%)';

    // Built on Jellyfin's own theme settings (type sizes, filled fields, button defaults…),
    // with Cinema's colours and shapes on top
    return createTheme(deepmerge(DEFAULT_THEME_OPTIONS, {
        // The dashboard's components read colours from CSS variables (theme.vars), so this theme
        // provides its own, under a separate prefix so they never clash with the main theme's
        cssVariables: {
            cssVarPrefix: 'cinema',
            disableCssColorScheme: true
        },
        defaultColorScheme: 'dark',
        // Only a dark scheme; the app's type lists every Jellyfin scheme, which this theme doesn't need
        colorSchemes: { dark: { palette: {
            ...DEFAULT_COLOR_SCHEME.palette,
            mode: 'dark',
            primary: { main: palette.accent, contrastText: '#0b0c14' },
            secondary: { main: palette.accent2 },
            background: { default: palette.bg, paper: raised },
            text: { primary: INK, secondary: alpha(INK, 0.66) },
            AppBar: { defaultBg: surface },
            divider: GLASS_EDGE,
            action: {
                hover: 'rgba(255, 255, 255, 0.06)',
                selected: alpha(palette.accent, 0.16)
            }
        } } } as unknown as CinemaThemeOptions['colorSchemes'],
        shape: { borderRadius: 14 },
        typography: {
            fontFamily: '\'Noto Sans\', sans-serif',
            button: { textTransform: 'none', fontWeight: 600 },
            h1: { fontWeight: 700, letterSpacing: '-0.02em' },
            h2: { fontWeight: 700, letterSpacing: '-0.02em' },
            h3: { fontWeight: 700, letterSpacing: '-0.01em' }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: blur,
                        border: `1px solid ${GLASS_EDGE}`
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        background: surface,
                        backdropFilter: blur,
                        border: 0,
                        borderBottom: `1px solid ${GLASS_EDGE}`,
                        boxShadow: 'none'
                    }
                }
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        background: surface,
                        backdropFilter: blur,
                        border: 0,
                        borderRight: `1px solid ${GLASS_EDGE}`
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: { borderRadius: 999, paddingInline: 18 },
                    containedPrimary: {
                        boxShadow: `0 8px 26px ${alpha(palette.accent, 0.3)}`,
                        '&:hover': { boxShadow: `0 10px 32px ${alpha(palette.accent, 0.45)}` }
                    }
                }
            },
            MuiIconButton: {
                styleOverrides: {
                    root: { transition: 'background-color 0.2s ease, transform 0.2s ease' }
                }
            },
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        margin: '2px 8px',
                        borderRadius: 12,
                        '&.Mui-selected, &.Mui-selected:hover': {
                            color: palette.accent,
                            background: alpha(palette.accent, 0.14),
                            boxShadow: `inset 3px 0 0 ${palette.accent}`
                        },
                        '&.Mui-selected .MuiListItemIcon-root': { color: palette.accent }
                    }
                }
            },
            MuiListSubheader: {
                styleOverrides: {
                    root: {
                        background: 'transparent',
                        color: alpha(INK, 0.45),
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                    }
                }
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        background: 'rgba(255, 255, 255, 0.05)',
                        '&:hover': { background: 'rgba(255, 255, 255, 0.08)' },
                        '&.Mui-focused': { background: 'rgba(255, 255, 255, 0.07)' },
                        '&::before, &::after': { display: 'none' }
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        background: 'rgba(255, 255, 255, 0.04)'
                    },
                    notchedOutline: { borderColor: 'rgba(255, 255, 255, 0.14)' }
                }
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 24,
                        background: isSolid ? 'rgb(18, 20, 30)' : 'rgba(18, 20, 30, 0.82)',
                        boxShadow: '0 40px 120px rgba(0, 0, 0, 0.6)'
                    }
                }
            },
            // Dropdown lists and pop-up menus: a glass panel with rounded, accent-tinted choices
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        marginTop: 6,
                        borderRadius: 16,
                        background: isSolid ? 'rgb(20, 22, 32)' : 'rgba(20, 22, 32, 0.86)',
                        backdropFilter: blur,
                        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)'
                    },
                    list: { padding: 6 }
                }
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        minHeight: 40,
                        borderRadius: 10,
                        fontSize: '0.95rem',
                        '&:hover': { background: 'rgba(255, 255, 255, 0.07)' },
                        '&.Mui-selected, &.Mui-selected.Mui-focusVisible': {
                            color: palette.accent,
                            fontWeight: 600,
                            background: alpha(palette.accent, 0.14)
                        },
                        '&.Mui-selected:hover': { background: alpha(palette.accent, 0.2) },
                        '&.Mui-focusVisible': { background: 'rgba(255, 255, 255, 0.09)' }
                    }
                }
            },
            MuiAutocomplete: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                        background: isSolid ? 'rgb(20, 22, 32)' : 'rgba(20, 22, 32, 0.86)'
                    },
                    option: { borderRadius: 10, margin: '0 6px' }
                }
            },
            MuiSnackbarContent: {
                styleOverrides: {
                    root: {
                        borderRadius: 14,
                        color: INK,
                        background: isSolid ? 'rgb(20, 22, 32)' : 'rgba(20, 22, 32, 0.9)',
                        border: `1px solid ${GLASS_EDGE}`
                    }
                }
            },
            MuiTableCell: {
                styleOverrides: {
                    root: { borderColor: 'rgba(255, 255, 255, 0.06)' },
                    head: { color: alpha(INK, 0.6), fontWeight: 600 }
                }
            },
            MuiTabs: {
                styleOverrides: {
                    indicator: {
                        height: 3,
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${palette.accent}, ${palette.accent2})`
                    }
                }
            },
            MuiTab: {
                styleOverrides: {
                    root: { textTransform: 'none', fontWeight: 600 }
                }
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 999 }
                }
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 10,
                        background: 'rgba(20, 22, 32, 0.92)',
                        border: `1px solid ${GLASS_EDGE}`,
                        fontSize: '0.8rem'
                    }
                }
            },
            MuiAlert: {
                styleOverrides: {
                    root: { borderRadius: 14 }
                }
            }
        }
    }));
};

/** The same theme, used for the main Cinema app's Material UI controls (settings pages, menus). */
export const createCinemaMuiTheme = createCinemaDashboardTheme;
