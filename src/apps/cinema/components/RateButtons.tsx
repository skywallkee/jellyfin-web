import ThumbDown from '@mui/icons-material/ThumbDown';
import ThumbDownOutlined from '@mui/icons-material/ThumbDownOutlined';
import ThumbUp from '@mui/icons-material/ThumbUp';
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined';
import { getUserDataApi } from '@jellyfin/sdk/lib/utils/api/user-data-api';
import { useQueryClient } from '@tanstack/react-query';
import classNames from 'classnames';
import React, { type FC, useEffect, useState } from 'react';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { refreshUserData } from '../utils/refresh';
import { playSound } from '../utils/sounds';

type Rating = boolean | null;

const RATEABLE_TYPES = new Set([ 'Movie', 'Series', 'Episode', 'Video', 'MusicVideo' ]);

/**
 * Thumbs up / thumbs down for a title. Pressing the chosen one again clears it. The rating is
 * saved per user on the server and steers Cinema's picks ("Because you liked…", Surprise me,
 * the end screen), which leave out anything thumbed down.
 */
const RateButtons: FC<{ item: ItemDto }> = ({ item }) => {
    const { api, user } = useApi();
    const queryClient = useQueryClient();
    const [ rating, setRating ] = useState<Rating>(item.UserData?.Likes ?? null);

    useEffect(() => setRating(item.UserData?.Likes ?? null), [ item.UserData?.Likes ]);

    if (!RATEABLE_TYPES.has(item.Type ?? '')) return null;

    const rate = (likes: boolean) => {
        if (!api || !user?.Id || !item.Id) return;
        const previous = rating;
        const next = previous === likes ? null : likes;
        setRating(next);
        if (next !== null) playSound('select');
        const userDataApi = getUserDataApi(api);
        const request = next === null ?
            userDataApi.deleteUserItemRating({ itemId: item.Id, userId: user.Id }) :
            userDataApi.updateUserItemRating({ itemId: item.Id, userId: user.Id, likes: next });
        request
            .then(() => refreshUserData(queryClient))
            .catch(() => setRating(previous));
    };

    const upLabel = globalize.translate('CinemaLike');
    const downLabel = globalize.translate('CinemaDislike');

    return (
        <span className='cinema-rate' role='group' aria-label={globalize.translate('CinemaRateTitle')}>
            <button
                type='button'
                className={classNames('cinema-btn cinema-btn--round cinema-glass cinema-focusable', { 'is-on': rating === true })}
                onClick={() => rate(true)}
                aria-pressed={rating === true}
                aria-label={upLabel}
                title={upLabel}
            >
                {rating === true ? <ThumbUp key='on' className='cinema-pop' /> : <ThumbUpOutlined key='off' />}
            </button>
            <button
                type='button'
                className={classNames('cinema-btn cinema-btn--round cinema-glass cinema-focusable', { 'is-on': rating === false })}
                onClick={() => rate(false)}
                aria-pressed={rating === false}
                aria-label={downLabel}
                title={downLabel}
            >
                {rating === false ? <ThumbDown key='on' className='cinema-pop' /> : <ThumbDownOutlined key='off' />}
            </button>
        </span>
    );
};

export default RateButtons;
