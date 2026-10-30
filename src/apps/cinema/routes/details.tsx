import React, { type FC, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

import ViewManagerPage from 'components/viewManager/ViewManagerPage';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import DetailsView from '../features/details/DetailsView';
import { CINEMA_DETAIL_TYPES } from '../hooks/useItemLink';

const PersonView = lazy(() => import(/* webpackChunkName: "cinema-person" */ '../features/details/PersonView'));
const GenreView = lazy(() => import(/* webpackChunkName: "cinema-genre" */ '../features/details/GenreView'));
const CollectionView = lazy(() => import(/* webpackChunkName: "cinema-collection" */ '../features/details/CollectionView'));

/** People, genres and collections have their own views, also when opened as a full page. */
const SpecialView: FC<{ item: ItemDto }> = ({ item }) => {
    if (item.Type === 'Person') return <PersonView item={item} />;
    if (item.Type === 'Genre') return <GenreView item={item} />;
    if (item.Type === 'BoxSet') return <CollectionView item={item} />;
    return null;
};

const SPECIAL_TYPES = new Set([ 'Person', 'Genre', 'BoxSet' ]);

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

    if (SPECIAL_TYPES.has(item.Type ?? '')) {
        return (
            <div className='cinema-details-page'>
                <Suspense fallback={<div className='cinema-details cinema-details--loading' aria-busy='true' />}>
                    <SpecialView key={item.Id} item={item} />
                </Suspense>
            </div>
        );
    }

    // Keyed by id so state such as the chosen season resets when moving between items
    return <DetailsView key={item.Id} item={item} />;
};

export default Details;
