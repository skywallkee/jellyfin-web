import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import classNames from 'classnames';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';

import MediaCard from '../components/MediaCard';
import { useMyList, useMyListItems } from '../features/mylist/api';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { isMostlyWide } from '../utils/images';

/** My List: everything the user saved to watch later, newest first. */
const MyList: FC = () => {
    useHideLegacyView(true, globalize.translate('CinemaMyList'));
    const { entries } = useMyList();
    const { data: items, isPending } = useMyListItems();
    const shape = isMostlyWide(items) ? 'landscape' : 'poster';
    const isEmpty = entries.length === 0;

    return (
        <div className='cinema-library cinema-mylist'>
            <header className='cinema-library__header'>
                <h1 className='cinema-library__title'>{globalize.translate('CinemaMyList')}</h1>
                {!isEmpty && <span className='cinema-row__count'>{globalize.translate('ItemCount', entries.length)}</span>}
            </header>

            {isEmpty ?
                <div className='cinema-empty'>
                    <BookmarkBorder className='cinema-empty__icon' />
                    <p className='cinema-empty__title'>{globalize.translate('CinemaMyListEmpty')}</p>
                    <p className='cinema-empty__text'>{globalize.translate('CinemaMyListEmptyHelp')}</p>
                </div> :
                <div className={classNames('cinema-grid cinema-stagger is-visible', `cinema-grid--${shape}`)}>
                    {isPending && !items ?
                        entries.slice(0, 12).map(entry => (
                            <span key={entry.id} className={classNames('cinema-card cinema-skeleton', `cinema-card--${shape}`)} />
                        )) :
                        items?.map((item, index) => (
                            <MediaCard
                                key={item.Id}
                                index={index}
                                item={item}
                                shape={shape}
                                subtitle={item.ProductionYear?.toString()}
                                showProgress
                            />
                        ))}
                </div>}
        </div>
    );
};

export default MyList;
