import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import StarHalf from '@mui/icons-material/StarHalf';
import classNames from 'classnames';
import React, { type FC, type KeyboardEvent, type MouseEvent, useState } from 'react';

import globalize from 'lib/globalize';

import { MAX_STARS, STAR_STEP, clampStars } from './diary';

const STAR_POSITIONS = Array.from({ length: MAX_STARS }, (_, i) => i + 1);

const StarIcon: FC<{ position: number; value: number }> = ({ position, value }) => {
    if (value >= position) return <Star />;
    if (value >= position - STAR_STEP) return <StarHalf />;
    return <StarBorder />;
};

/** Read-only stars, e.g. beside a diary entry. */
export const StarsShown: FC<{ value: number; className?: string }> = ({ value, className }) => (
    <span className={classNames('cinema-stars', className)} role='img' aria-label={globalize.translate('CinemaStarsLabel', value)}>
        {STAR_POSITIONS.map(position => <StarIcon key={position} position={position} value={value} />)}
    </span>
);

interface StarsInputProps {
    value: number;
    onChange: (value: number) => void;
}

/**
 * Five stars to rate with, in half steps: the left half of a star gives half of it. Hovering previews;
 * arrow keys step by half a star; clicking the current rating again clears it.
 */
export const StarsInput: FC<StarsInputProps> = ({ value, onChange }) => {
    const [ preview, setPreview ] = useState<number>();

    const valueAt = (e: MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return clampStars(Math.ceil(((e.clientX - rect.left) / rect.width) * MAX_STARS / STAR_STEP) * STAR_STEP);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        const step = { ArrowRight: STAR_STEP, ArrowUp: STAR_STEP, ArrowLeft: -STAR_STEP, ArrowDown: -STAR_STEP }[e.key];
        if (step == null) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(clampStars(value + step));
    };

    const shown = preview ?? value;

    return (
        <div
            className='cinema-stars cinema-stars--input cinema-focusable'
            role='slider'
            tabIndex={0}
            aria-label={globalize.translate('CinemaYourRating')}
            aria-valuemin={0}
            aria-valuemax={MAX_STARS}
            aria-valuenow={value}
            aria-valuetext={value ? globalize.translate('CinemaStarsLabel', value) : globalize.translate('CinemaNotRated')}
            onKeyDown={onKeyDown}
        >
            {/* The stars alone measure where the pointer is; the keyboard is handled by the slider itself */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <span
                className='cinema-stars__hit'
                onPointerMove={e => setPreview(valueAt(e))}
                onPointerLeave={() => setPreview(undefined)}
                onClick={e => {
                    const next = valueAt(e);
                    onChange(next === value ? 0 : next);
                }}
            >
                {STAR_POSITIONS.map(position => <StarIcon key={position} position={position} value={shown} />)}
            </span>
            <span className='cinema-stars__value'>
                {shown ? shown.toLocaleString(undefined, { minimumFractionDigits: 1 }) : globalize.translate('CinemaNotRated')}
            </span>
        </div>
    );
};
