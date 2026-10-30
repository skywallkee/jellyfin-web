import { useCallback, useSyncExternalStore } from 'react';

export type CinemaThemeId = 'midnight' | 'aurora' | 'ember' | 'emerald' | 'mono';

/** The Cinema themes, in the order they're offered (the swatches and the Display settings list). */
export const CINEMA_THEMES: { id: CinemaThemeId; labelKey: string }[] = [
    { id: 'midnight', labelKey: 'CinemaThemeMidnight' },
    { id: 'aurora', labelKey: 'CinemaThemeAurora' },
    { id: 'ember', labelKey: 'CinemaThemeEmber' },
    { id: 'emerald', labelKey: 'CinemaThemeEmerald' },
    { id: 'mono', labelKey: 'CinemaThemeMono' }
];

export interface CinemaSettings {
    theme: CinemaThemeId;
    /** Play a muted clip of the title in hover previews. */
    videoPreviews: boolean;
    /** Use solid panels instead of see-through glass. */
    reduceTransparency: boolean;
    /** Soft ticks when moving focus and selecting with a remote. Unset means on for TV, off otherwise. */
    interfaceSounds?: boolean;
    /** A faint film-grain and vignette finish over artwork. */
    filmGrain: boolean;
    /** Show a slideshow of artwork with a clock after a few idle minutes. */
    screensaver: boolean;
    /** Play a title's theme song quietly while its details are open. */
    themeMusic: boolean;
    /** Blur the stills and hide the descriptions of episodes not watched yet. */
    spoilerFree: boolean;
    /** Seasonal touches (Halloween, the holidays…) around their dates. */
    seasonal: boolean;
}

export const DEFAULT_SETTINGS: CinemaSettings = {
    theme: 'midnight',
    videoPreviews: true,
    reduceTransparency: false,
    filmGrain: true,
    screensaver: true,
    themeMusic: true,
    spoilerFree: false,
    seasonal: true
};

const STORAGE_KEY = 'cinema-settings';
const listeners = new Set<() => void>();

const read = (): CinemaSettings => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
        // Storage can be unavailable (private mode, blocked site data); fall back to defaults
        return DEFAULT_SETTINGS;
    }
};

let current = read();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = () => current;

/** The current settings, for code outside React (e.g. sounds played from key handlers). */
export const getCinemaSettings = () => current;

export const updateCinemaSettings = (changes: Partial<CinemaSettings>) => {
    current = { ...current, ...changes };
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Keep the change for this session even if it can't be saved
    }
    for (const listener of listeners) listener();
};

/** Cinema display preferences, saved in this browser. Components re-render when they change. */
export const useCinemaSettings = () => {
    const settings = useSyncExternalStore(subscribe, getSnapshot);
    const update = useCallback((changes: Partial<CinemaSettings>) => updateCinemaSettings(changes), []);
    return [ settings, update ] as const;
};

let soundsByDefault = false;

/** Sets whether sounds are on when the user hasn't chosen: the app turns them on for the TV layout. */
export const setSoundsOnByDefault = (isOn: boolean) => {
    soundsByDefault = isOn;
};

/** Whether interface sounds are on: the user's choice, or the layout's default. */
export const areSoundsEnabled = (settings: CinemaSettings) => settings.interfaceSounds ?? soundsByDefault;
