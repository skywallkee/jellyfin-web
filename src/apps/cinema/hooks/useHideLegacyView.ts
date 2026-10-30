import { useEffect } from 'react';

import viewManager from 'components/viewManager/viewManager';

import { BRAND_NAME } from '../brand';

/**
 * Hides the previous legacy (HTML/controller) page when a Cinema page opens, and sets the browser
 * tab's title for the page.
 *
 * Legacy pages such as the settings forms live in their own container and stay on screen until
 * something hides them. jellyfin-web's own React pages do this through the shared `Page` component;
 * Cinema pages don't use it, so without this the old page would keep showing underneath (and the
 * tab would keep that page's title).
 */
export const useHideLegacyView = (isEnabled = true, title?: string | null) => {
    useEffect(() => {
        if (isEnabled) viewManager.hideView();
    }, [ isEnabled ]);

    useEffect(() => {
        if (isEnabled) document.title = title || BRAND_NAME;
    }, [ isEnabled, title ]);
};
