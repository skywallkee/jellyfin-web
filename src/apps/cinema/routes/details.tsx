import React, { type FC } from 'react';
import { useSearchParams } from 'react-router-dom';

import ViewManagerPage from 'components/viewManager/ViewManagerPage';
import { useItem } from 'hooks/useItem';

import DetailsView from '../features/details/DetailsView';
import { CINEMA_DETAIL_TYPES } from '../hooks/useItemLink';

const LegacyDetails: FC = () => (
    <ViewManagerPage
        controller='itemDetails/index'
        view='itemDetails/index.html'
    />
);

const Details: FC = () => {
    const [ searchParams ] = useSearchParams();
    const itemId = searchParams.get('id') ?? undefined;
    const { data: item, isPending, isError } = useItem(itemId);

    if (isError || (item && !CINEMA_DETAIL_TYPES.has(item.Type ?? ''))) {
        return <LegacyDetails />;
    }

    if (isPending || !item) {
        return <div className='cinema-details cinema-details--loading' aria-busy='true' />;
    }

    // Keyed by id so state such as the chosen season resets when moving between items
    return <DetailsView key={item.Id} item={item} />;
};

export default Details;
