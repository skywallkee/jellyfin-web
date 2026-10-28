import { useEffect } from 'react';

import viewManager from 'components/viewManager/viewManager';

/**
 * Hides the previous legacy (HTML/controller) page when a Cinema page opens.
 *
 * Legacy pages such as the settings forms live in their own container and stay on screen until
 * something hides them. jellyfin-web's own React pages do this through the shared `Page` component;
 * Cinema pages don't use it, so without this the old page would keep showing underneath.
 */
export const useHideLegacyView = (isEnabled = true) => {
    useEffect(() => {
        if (isEnabled) viewManager.hideView();
    }, [ isEnabled ]);
};
