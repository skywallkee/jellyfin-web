import type { QueryClient } from '@tanstack/react-query';

/** Queries showing random picks: refreshing them would reshuffle what the user is looking at. */
const RANDOM_QUERIES = new Set([ 'Spotlight', 'ScreensaverSlides', 'AlsoWatch', 'Surprise', 'SmartRow' ]);

/**
 * Refreshes the user's data after they change something (favourite, watched, Continue Watching),
 * except random picks, which would otherwise jump to different titles under the pointer.
 */
export const refreshUserData = (queryClient: QueryClient) => queryClient.invalidateQueries({
    queryKey: [ 'User' ],
    predicate: query => !query.queryKey.some(part => typeof part === 'string' && RANDOM_QUERIES.has(part))
});
