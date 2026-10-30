import { CinemaLayoutModes, LayoutMode, LegacyLayoutModes } from 'constants/layoutMode';

import { appHost } from './apphost';
import browser from '../scripts/browser';
import appSettings from '../scripts/settings/appSettings';
import Events from '../utils/events.ts';

function setLayout(instance, layout, selectedLayout) {
    if (layout === selectedLayout) {
        instance[layout] = true;
        document.documentElement.classList.add('layout-' + layout);
    } else {
        instance[layout] = false;
        document.documentElement.classList.remove('layout-' + layout);
    }
}

export const SETTING_KEY = 'layout';

/**
 * Only the Cinema layouts remain. Any other layout asked for (by an old setting, or a native app's
 * default) becomes Cinema, or Cinema TV for the TV layout; "" (auto) stays as it is.
 */
const toCinemaLayout = (layout) => {
    if (!layout || CinemaLayoutModes.has(layout)) return layout;
    return layout === LayoutMode.Tv ? LayoutMode.CinemaTv : LayoutMode.Cinema;
};

class LayoutManager {
    tv = false;
    mobile = false;
    desktop = false;
    modern = false;
    /** Whether the cinema app is used. */
    cinema = false;
    /** Whether the cinema app uses its TV (remote control) variant. */
    cinemaTv = false;

    setLayout(layout = '', save = true) {
        const layoutValue = toCinemaLayout((!layout || layout === LayoutMode.Auto) ? '' : layout);
        const isLegacyLayout = LegacyLayoutModes.has(layoutValue);
        // Normalize layout mode to the base mode (e.g. 'mobile-legacy' -> 'mobile')
        const normalizedLayout = layoutValue.split('-')[0];

        if (!layoutValue) {
            // Auto applies the default layout in full; only the choice of "auto" is saved
            this.autoLayout();
            if (save) appSettings.set(SETTING_KEY, '');
            return;
        }

        setLayout(this, LayoutMode.Mobile, normalizedLayout);
        setLayout(this, LayoutMode.Tv, normalizedLayout);
        setLayout(this, LayoutMode.Desktop, normalizedLayout);

        console.debug('[LayoutManager] using layout mode', normalizedLayout);
        this.modern = !isLegacyLayout;
        this.cinema = CinemaLayoutModes.has(layoutValue);
        this.cinemaTv = layoutValue === LayoutMode.CinemaTv;
        if (layoutValue === LayoutMode.Modern || this.cinema) {
            const legacyLayoutMode = browser.mobile ? LayoutMode.Mobile : LayoutMode.Desktop;
            console.debug('[LayoutManager] using legacy layout mode', legacyLayoutMode);
            setLayout(this, legacyLayoutMode, legacyLayoutMode);
        }

        if (save) appSettings.set(SETTING_KEY, layoutValue);

        Events.trigger(this, 'modechange');
    }

    getSavedLayout() {
        const saved = appSettings.get(SETTING_KEY);
        // Only the Cinema layouts remain; an older saved choice (desktop, mobile, tv…) means "auto"
        if (saved && CinemaLayoutModes.has(saved)) {
            return saved;
        }
    }

    autoLayout() {
        // Take a guess at initial layout. The consuming app can override.
        // NOTE: The fallback to TV mode seems like an outdated choice. TVs should be detected properly or override the
        // default layout.
        // TVs get the cinema app's remote-control variant; everything else the host's default (cinema in browsers).
        this.setLayout(browser.tv ? LayoutMode.CinemaTv : this.defaultLayout || LayoutMode.Cinema, false);
    }

    init() {
        const saved = this.getSavedLayout();
        if (saved) {
            this.setLayout(saved, false);
        } else {
            this.autoLayout();
        }
    }
}

const layoutManager = new LayoutManager();

if (appHost.getDefaultLayout) {
    layoutManager.defaultLayout = appHost.getDefaultLayout();
}

layoutManager.init();

export default layoutManager;
