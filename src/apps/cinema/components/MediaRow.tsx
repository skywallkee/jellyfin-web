import classNames from 'classnames';
import React, { type FC, useRef } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import MediaCard, { type CardShape } from './MediaCard';
import ScrollTrack from './ScrollTrack';
import { useInView } from '../hooks/useInView';

const SKELETON_COUNT = 6;

interface MediaRowProps {
    title: string;
    items?: ItemDto[];
    isPending?: boolean;
    shape: CardShape;
    showProgress?: boolean;
    getSubtitle?: (item: ItemDto) => string | undefined;
}

const MediaRow: FC<MediaRowProps> = ({ title, items, isPending, shape, showProgress, getSubtitle }) => {
    const rowRef = useRef<HTMLElement>(null);
    // Cards fade up one after another the first time the row scrolls into view
    const isInView = useInView(rowRef);

    if (!isPending && !items?.length) return null;

    return (
        <section
            ref={rowRef}
            className={classNames('cinema-row cinema-stagger', { 'is-visible': isInView })}
            aria-label={title}
        >
            <h2 className='cinema-row__title'>
                {title}
                {items && items.length > 0 && <span className='cinema-row__count'>{items.length}</span>}
            </h2>
            <ScrollTrack className='cinema-row__track'>
                {isPending ?
                    Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <span
                            key={i}
                            className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)}
                        />
                    )) :
                    items?.map((item, index) => (
                        <MediaCard
                            key={item.Id}
                            index={index}
                            item={item}
                            shape={shape}
                            showProgress={showProgress}
                            subtitle={getSubtitle?.(item)}
                        />
                    ))}
            </ScrollTrack>
        </section>
    );
};

export default MediaRow;
