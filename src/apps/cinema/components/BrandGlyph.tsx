import React, { type FC } from 'react';

// Same shapes as the tab icon (assets/img/sky-cinema.svg); change both together
const PLAY_PATH = 'M8.6 7.3v9.4a.9.9 0 0 0 1.4.8l7.4-4.7a.9.9 0 0 0 0-1.6L10 6.5a.9.9 0 0 0-1.4.8z';
const STAR_PATH = 'M17.6 3.2l.75 1.9 1.9.75-1.9.75-.75 1.9-.75-1.9-1.9-.75 1.9-.75z';

/** The Sky Cinema glyph: a play button with a small star above it, in the current text colour. */

const BrandGlyph: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' focusable='false'>
        <path d={PLAY_PATH} />
        <path d={STAR_PATH} />
    </svg>
);

export default BrandGlyph;
