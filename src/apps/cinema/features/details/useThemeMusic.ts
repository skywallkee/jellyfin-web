import { useEffect } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

import { useCinemaSettings } from '../../utils/settings';

import { useThemeSong } from './moreApi';

/** Soft enough to sit under browsing, like music in a theatre lobby. */
const THEME_VOLUME = 0.22;
const FADE_IN_MS = 1800;
const FADE_OUT_MS = 700;
const FADE_STEP_MS = 50;

/** Moves an audio element's volume towards a target over time, then calls back. */
const fade = (audio: HTMLAudioElement, to: number, durationMs: number, onDone?: () => void) => {
    const from = audio.volume;
    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let step = 0;
    const timer = window.setInterval(() => {
        step++;
        audio.volume = Math.min(1, Math.max(0, from + (to - from) * (step / steps)));
        if (step >= steps) {
            window.clearInterval(timer);
            onDone?.();
        }
    }, FADE_STEP_MS);
    return () => window.clearInterval(timer);
};

/** Shows, seasons and episodes share the series' theme; movies have their own. */
const getThemeOwnerId = (item: ItemDto) => {
    if (item.Type === 'Episode' || item.Type === 'Season') return item.SeriesId;
    if (item.Type === 'Series' || item.Type === 'Movie') return item.Id;
    return undefined;
};

/**
 * Plays the title's theme song quietly while its details are open, fading in and out,
 * when the library has one and "Theme music" is on. Pauses while the tab is hidden.
 */
export const useThemeMusic = (item: ItemDto) => {
    const { api } = useApi();
    const [ settings ] = useCinemaSettings();
    const { data: song } = useThemeSong(getThemeOwnerId(item), settings.themeMusic);

    useEffect(() => {
        if (!api || !song?.Id || !settings.themeMusic) return;
        const audio = new Audio(`${api.basePath}/Audio/${song.Id}/stream?static=true&api_key=${api.accessToken}`);
        audio.volume = 0;
        audio.loop = true;
        let stopFade: (() => void) | undefined;

        // Browsers may block sound until the user has interacted; then it just stays silent
        audio.play().then(() => {
            stopFade = fade(audio, THEME_VOLUME, FADE_IN_MS);
        }).catch(() => { /* not allowed to play yet */ });

        const onVisibility = () => {
            if (document.hidden) audio.pause();
            else audio.play().catch(() => { /* still blocked */ });
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            stopFade?.();
            fade(audio, 0, FADE_OUT_MS, () => {
                audio.pause();
                audio.removeAttribute('src');
                audio.load();
            });
        };
    }, [ api, settings.themeMusic, song?.Id ]);
};
