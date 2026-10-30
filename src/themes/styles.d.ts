import '@mui/material/styles';

/** Extend MUI types to include our customizations. */
declare module '@mui/material/styles' {
    interface Palette {
        starIcon: Palette['primary'];
    }

    interface PaletteOptions {
        starIcon?: PaletteOptions['primary'];
    }
}
