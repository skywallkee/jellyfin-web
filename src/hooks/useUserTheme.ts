export const FALLBACK_THEME_ID = 'dark';

/**
 * The Jellyfin theme stylesheet to load. Only the dark base remains (Cinema draws its own themes on
 * top), so this is always it, whatever an older version saved.
 */
export function useUserTheme() {
    return {
        theme: FALLBACK_THEME_ID,
        dashboardTheme: FALLBACK_THEME_ID
    };
}
