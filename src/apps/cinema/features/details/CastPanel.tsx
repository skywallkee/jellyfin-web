import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

const MAX_CAST = 16;
/** Crew roles shown after the actors. */
const CREW_TYPES = new Set([ 'Director', 'Writer', 'Producer', 'Creator' ]);

interface CastPanelProps {
    item: ItemDto;
}

const CastPanel: FC<CastPanelProps> = ({ item }) => {
    const { api } = useApi();
    const people = item.People ?? [];
    const cast = [
        ...people.filter(person => person.Type === 'Actor' || person.Type === 'GuestStar'),
        ...people.filter(person => person.Type && CREW_TYPES.has(person.Type))
    ].slice(0, MAX_CAST);

    if (!cast.length) return null;

    return (
        <section className='cinema-panel cinema-glass' aria-label={globalize.translate('HeaderCastAndCrew')}>
            <h2 className='cinema-panel__title'>{globalize.translate('HeaderCastAndCrew')}</h2>
            <div className='cinema-cast'>
                {cast.map(person => {
                    const imageUrl = api && person.Id && person.PrimaryImageTag ?
                        getImageApi(api).getItemImageUrlById(person.Id, ImageType.Primary, {
                            tag: person.PrimaryImageTag,
                            maxWidth: 160
                        }) :
                        undefined;
                    const to = appRouter.getRouteUrl({ Id: person.Id, Type: 'Person', ServerId: item.ServerId }).substring(1);
                    const role = person.Role || (person.Type ? globalize.translate(person.Type) : undefined);

                    return (
                        <Link
                            key={`${person.Id}-${person.Type}-${person.Role}`}
                            to={to}
                            className='cinema-person cinema-focusable'
                        >
                            <span
                                className='cinema-person__pic'
                                style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
                            >
                                {!imageUrl && (person.Name ?? '?').slice(0, 1)}
                            </span>
                            <span className='cinema-person__name'>{person.Name}</span>
                            {role && <span className='cinema-person__role'>{role}</span>}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default CastPanel;
