import classNames from 'classnames';
import React, { type CSSProperties, type FC, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAmbientColor } from '../utils/ambient';
import { brighten, type Rgb, toRgbString } from '../utils/blurhash';
import { useCinemaSettings } from '../utils/settings';

/** Matches the fade in the styles; the old light is removed once the new one has fully appeared. */
const FADE_MS = 1200;

interface Light {
    key: number;
    color?: Rgb;
}

let nextKey = 0;

/**
 * Each colour gets its own layer, painted once, that fades in over the previous one. Fading a
 * layer's opacity is handled by the graphics card, unlike animating the gradient's colour, which
 * would repaint the whole screen every frame.
 */
const useLights = (color?: Rgb) => {
    const [ lights, setLights ] = useState<Light[]>(() => [ { key: nextKey++, color } ]);

    useEffect(() => {
        setLights(previous => {
            if (previous[previous.length - 1]?.color === color) return previous;
            return [ ...previous.slice(-1), { key: nextKey++, color } ];
        });
        const timer = window.setTimeout(() => setLights(previous => previous.slice(-1)), FADE_MS);
        return () => window.clearTimeout(timer);
    }, [ color ]);

    return lights;
};

/**
 * The light of the screen: a soft glow in the colours of whatever is featured (fading between
 * titles), plus an optional film-grain and vignette finish. Sits behind and over everything,
 * never catching the pointer.
 */
const AmbientLayer: FC = () => {
    const color = useAmbientColor();
    const lights = useLights(color);
    const [ settings ] = useCinemaSettings();
    // Never lay grain over the actual movie
    const isVideo = useLocation().pathname === '/video';

    return (
        <>
            {/* Slowly drifting light in the theme's colours, always there under everything */}
            <div className='cinema-aurora' aria-hidden='true' />
            {lights.map((light, i) => (
                <div
                    key={light.key}
                    // The newest light fades in while the one before fades out
                    className={classNames('cinema-ambient', { 'is-tinted': light.color, 'is-leaving': i < lights.length - 1 })}
                    style={light.color ? { color: `rgb(${toRgbString(brighten(light.color))})` } as CSSProperties : undefined}
                    aria-hidden='true'
                />
            ))}
            {settings.filmGrain && !isVideo && (
                <>
                    <div className='cinema-vignette' aria-hidden='true' />
                    <div className='cinema-grain' aria-hidden='true' />
                </>
            )}
        </>
    );
};

export default AmbientLayer;
