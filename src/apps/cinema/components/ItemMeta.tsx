import React, { type FC } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import { formatRuntime, getEpisodeLabel, getQualityLabels } from '../utils/items';

interface ItemMetaProps {
    item: ItemDto;
    /** Show resolution, HDR and audio chips read from the media streams. */
    showQuality?: boolean;
}

/** One line of chips and dot-separated facts: year, rating, runtime, genres, score. */
const ItemMeta: FC<ItemMetaProps> = ({ item, showQuality }) => {
    const chips = [
        item.ProductionYear?.toString(),
        item.OfficialRating,
        ...(showQuality ? getQualityLabels(item) : [])
    ].filter((chip): chip is string => Boolean(chip));

    const parts = [
        getEpisodeLabel(item),
        formatRuntime(item.RunTimeTicks),
        item.Genres?.slice(0, 2).join(' · '),
        item.CommunityRating ? `★ ${item.CommunityRating.toFixed(1)}` : undefined
    ].filter((part): part is string => Boolean(part));

    return (
        <div className='cinema-meta'>
            {chips.map(chip => (
                <span key={chip} className='cinema-chip cinema-glass'>{chip}</span>
            ))}
            {parts.map((part, i) => (
                <React.Fragment key={part}>
                    {i > 0 && <span className='cinema-dot' aria-hidden='true' />}
                    <span>{part}</span>
                </React.Fragment>
            ))}
        </div>
    );
};

export default ItemMeta;
