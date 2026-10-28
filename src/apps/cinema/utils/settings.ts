import { useCallback, useSyncExternalStore } from 'react';

export type CinemaThemeId = 'midnight' | 'aurora' | 'ember' | 'emerald' | 'mono';

export interface CinemaSettings {
    theme: CinemaThemeId;
    /** Play a muted clip of the title in hover previews. */
    videoPreviews: boolean;
    /** Use solid panels instead of see-through glass. */
    reduceTransparency: boolean;
}

export const DEFAULT_SETTINGS: CinemaSettings = {
    theme: 'midnight',
    videoPreviews: true,
    reduceTransparency: false
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
