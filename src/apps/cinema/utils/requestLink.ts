/** The "requestButton" settings from config.json (see getRequestButton in webSettings). */
export interface RequestButtonConfig {
    enabled: boolean;
    label: string;
    url: string;
    openInNewTab: boolean;
}

/** Only plain web links are followed, so a bad config value can't run script. */
export const isWebLink = (url: string) => {
    try {
        const { protocol } = new URL(url);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
};

/** The request site's search page (Seerr's /search) with the query already filled in. */
export const getRequestSearchUrl = (config: RequestButtonConfig, query: string) => {
    const url = new URL('search', config.url.endsWith('/') ? config.url : `${config.url}/`);
    url.searchParams.set('query', query.trim());
    return url.toString();
};

export const getRequestLinkProps = (config: RequestButtonConfig) => (
    config.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
);
