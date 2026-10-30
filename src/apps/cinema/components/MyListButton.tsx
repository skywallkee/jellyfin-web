import BookmarkAddOutlined from '@mui/icons-material/BookmarkAddOutlined';
import BookmarkAdded from '@mui/icons-material/BookmarkAdded';
import classNames from 'classnames';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useMyList } from '../features/mylist/api';
import { playSound } from '../utils/sounds';

/** Only titles you'd come back to watch go on My List (not people, genres or single episodes' seasons). */
const LISTABLE_TYPES = new Set([ 'Movie', 'Series', 'Episode', 'Video', 'MusicVideo', 'BoxSet' ]);

interface MyListButtonProps {
    item: ItemDto;
    /** Show "My List" next to the icon (for roomy places like the hero). */
    showLabel?: boolean;
}

/** An outlined bookmark adds the title to My List; a filled one shows it's there and takes it off again. */
const MyListButton: FC<MyListButtonProps> = ({ item, showLabel }) => {
    const { has, add, remove } = useMyList();
    if (!LISTABLE_TYPES.has(item.Type ?? '')) return null;

    const isOnList = has(item);
    const label = globalize.translate(isOnList ? 'CinemaRemoveFromMyList' : 'CinemaAddToMyList');

    return (
        <button
            type='button'
            className={classNames('cinema-btn cinema-glass cinema-focusable cinema-mylist-btn', {
                'cinema-btn--round': !showLabel,
                'is-on': isOnList
            })}
            onClick={() => {
                if (isOnList) {
                    remove(item);
                } else {
                    add(item);
                    playSound('select');
                }
            }}
            aria-pressed={isOnList}
            aria-label={label}
            title={label}
        >
            {/* A bookmark, so it never looks like the "watched" tick beside it; keyed so it pops on each change */}
            {isOnList ? <BookmarkAdded key='on' className='cinema-pop' /> : <BookmarkAddOutlined key='off' />}
            {showLabel && globalize.translate('CinemaMyList')}
        </button>
    );
};

export default MyListButton;
