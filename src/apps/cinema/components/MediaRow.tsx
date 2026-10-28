import classNames from 'classnames';
import React, { type FC } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import MediaCard, { type CardShape } from './MediaCard';

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
    if (!isPending && !items?.length) return null;

    return (
        <section className='cinema-row' aria-label={title}>
            <h2 className='cinema-row__title'>
                {title}
                {items && items.length > 0 && <span className='cinema-row__count'>{items.length}</span>}
            </h2>
            <div className='cinema-row__track'>
                {isPending ?
                    Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <span
                            key={i}
                            className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)}
                        />
                    )) :
                    items?.map(item => (
                        <MediaCard
                            key={item.Id}
                            item={item}
                            shape={shape}
                            showProgress={showProgress}
                            subtitle={getSubtitle?.(item)}
                        />
                    ))}
            </div>
        </section>
    );
};

export default MediaRow;
