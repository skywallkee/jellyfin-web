import { describe, expect, it } from 'vitest';

import { getRequestSearchUrl, type RequestButtonConfig } from './requestLink';

const config = (url: string): RequestButtonConfig => ({ enabled: true, label: '', url, openInNewTab: true });

describe('getRequestSearchUrl', () => {
    it('opens the request site search with the query filled in', () => {
        expect(getRequestSearchUrl(config('https://requests.example.com'), 'Spirited Away'))
            .toBe('https://requests.example.com/search?query=Spirited+Away');
    });

    it('keeps a sub-path and trims the query', () => {
        expect(getRequestSearchUrl(config('https://example.com/seerr/'), '  dune & co '))
            .toBe('https://example.com/seerr/search?query=dune+%26+co');
    });
});
