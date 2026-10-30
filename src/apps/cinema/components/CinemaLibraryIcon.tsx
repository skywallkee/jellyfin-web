import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import SubscriptionsOutlined from '@mui/icons-material/SubscriptionsOutlined';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import React, { type FC } from 'react';

import LibraryIcon from 'apps/modern/components/LibraryIcon';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client';

/** A torii gate, so the anime library reads as its own thing next to regular shows. */
export const AnimeIcon: FC<SvgIconProps> = props => (
    <SvgIcon {...props}>
        <path d='M1.5 3.6c3.4 1 6.9 1.4 10.5 1.4s7.1-.4 10.5-1.4l-.6 2.6c-3.2.8-6.5 1.2-9.9 1.2S5.3 7 2.1 6.2z' />
        <path d='M3.5 9.6h17v2h-17z' />
        <path d='M5.6 7.2h2.2v14.3H5.6zM16.2 7.2h2.2v14.3h-2.2zM10.9 7.6h2.2v2h-2.2z' />
    </SvgIcon>
);

/** Shows and anime are both "tvshows" libraries; the name tells them apart. */
export const isAnimeLibrary = (view: BaseItemDto) => (
    view.CollectionType === CollectionType.Tvshows && /anime|アニメ/i.test(view.Name ?? '')
);

/** Library icons for the Cinema navigation: a stack of episodes for shows, a torii gate for anime, a box for collections. */
const CinemaLibraryIcon: FC<{ item: BaseItemDto }> = ({ item }) => {
    if (isAnimeLibrary(item)) return <AnimeIcon />;
    if (item.CollectionType === CollectionType.Tvshows) return <SubscriptionsOutlined />;
    // A box for box sets, so it doesn't look like the shows' stack of episodes
    if (item.CollectionType === CollectionType.Boxsets) return <Inventory2Outlined />;
    return <LibraryIcon item={item} />;
};

export default CinemaLibraryIcon;
