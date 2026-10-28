const STORAGE_KEY = 'cinema-recent-searches';
const MAX_RECENT = 6;
const MIN_LENGTH = 2;

/** Searches made in this browser, newest first. */
export const getRecentSearches = (): string[] => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === 'string') : [];
    } catch {
        return [];
    }
};

export const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_LENGTH) return;
    const next = [ trimmed, ...getRecentSearches().filter(entry => entry.toLowerCase() !== trimmed.toLowerCase()) ]
        .slice(0, MAX_RECENT);
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Not saved when storage is unavailable; searching still works
    }
};

export const clearRecentSearches = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Nothing to clear
    }
};
