import ChevronRight from '@mui/icons-material/ChevronRight';
import classNames from 'classnames';
import React, { type FC, memo } from 'react';
import { Link } from 'react-router-dom';

import globalize from 'lib/globalize';

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
    /** Where "See all" in the title leads, e.g. the library the row comes from. */
    seeAllTo?: string;
    /** Show a large rank number beside each card, for a "Top 10" row. */
    isRanked?: boolean;
    /** Cards offer a play button that resumes straight away. */
    canResume?: boolean;
}

const MediaRow: FC<MediaRowProps> = ({ title, items, isPending, shape, showProgress, getSubtitle, seeAllTo, isRanked, canResume }) => {
    // Cards fade up one after another the first time the row scrolls into view
    const [ rowRef, isInView ] = useInView<HTMLElement>();

    if (!isPending && !items?.length) return null;

    const count = !isRanked && items && items.length > 0 ?
        <span className='cinema-row__count'>{items.length}</span> :
        null;

    return (
        <section
            ref={rowRef}
            className={classNames('cinema-row cinema-stagger', { 'is-visible': isInView, 'cinema-row--ranked': isRanked })}
            aria-label={title}
        >
            <h2 className='cinema-row__title'>
                {seeAllTo ?
                    <Link to={seeAllTo} className='cinema-row__link'>
                        {title}
                        {count}
                        <span className='cinema-row__seeall'>
                            {globalize.translate('CinemaSeeAll')}
                            <ChevronRight fontSize='small' />
                        </span>
                    </Link> :
                    <>
                        {title}
                        {count}
                    </>}
            </h2>
            <ScrollTrack className='cinema-row__track'>
                {isPending ?
                    Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <span
                            key={i}
                            className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)}
                        />
                    )) :
                    items?.map((item, index) => {
                        const card = (
                            <MediaCard
                                key={item.Id}
                                index={index}
                                item={item}
                                shape={shape}
                                showProgress={showProgress}
                                canResume={canResume}
                                subtitle={getSubtitle?.(item)}
                            />
                        );
                        return isRanked ? (
                            <div key={item.Id} className='cinema-ranked'>
                                <span className='cinema-ranked__number' aria-hidden='true'>{index + 1}</span>
                                {card}
                            </div>
                        ) : card;
                    })}
            </ScrollTrack>
        </section>
    );
};

// Rows only re-render when their own items change, not when the page around them does
export default memo(MediaRow);
