/** The different layout modes supported by the web app. */
export const enum LayoutMode {
    /** Automatic layout - the app chose the best layout for the detected device. */
    Auto = 'auto',
    /** The desktop layout. */
    Desktop = 'desktop',
    /** The legacy desktop layout. */
    DesktopLegacy = 'desktop-legacy',
    /** The modern responsive layout. */
    Modern = 'modern',
    /** The mobile layout. */
    Mobile = 'mobile',
    /** The legacy mobile layout. */
    MobileLegacy = 'mobile-legacy',
    /** The TV layout. */
    Tv = 'tv',
    /** The cinematic layout for desktop browsers. */
    Cinema = 'cinema',
    /** The cinematic layout tuned for TVs and remote control navigation. */
    CinemaTv = 'cinema-tv'
};

/** The layout modes that use the cinema app. */
export const CinemaLayoutModes = new Set([
    LayoutMode.Cinema,
    LayoutMode.CinemaTv
]);

/** The layout modes that use the legacy app. */
export const LegacyLayoutModes = new Set([
    LayoutMode.DesktopLegacy,
    LayoutMode.MobileLegacy,
    LayoutMode.Tv
]);
