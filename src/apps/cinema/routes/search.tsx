import type { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import Close from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import React, { type FC, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';

import { useSearchItems } from 'apps/legacy/features/search/api/useSearchItems';
import { useSearchSuggestions } from 'apps/legacy/features/search/api/useSearchSuggestions';
import useSearchParam from 'hooks/useSearchParam';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import type { CardShape } from '../components/MediaCard';
import MediaRow from '../components/MediaRow';
import { useItemLink } from '../hooks/useItemLink';
import { isMostlyWide } from '../utils/images';

const DEBOUNCE_MS = 400;
const SQUARE_TYPES = new Set([ 'Person', 'MusicArtist', 'MusicAlbum', 'Audio', 'Studio', 'Playlist' ]);
const LANDSCAPE_TYPES = new Set([ 'Episode', 'Video', 'TvChannel', 'Program', 'Recording' ]);

/** Picks a card shape for a results section from the kind of items in it. */
const getSectionShape = (items: ItemDto[]): CardShape => {
    const type = items[0]?.Type ?? '';
    if (SQUARE_TYPES.has(type)) return 'square';
    if (LANDSCAPE_TYPES.has(type) || isMostlyWide(items)) return 'landscape';
    return 'poster';
};

const getResultSubtitle = (item: ItemDto) => {
    // The card title already shows "Series · S1 E2", so episodes only need their own name here
    if (item.Type === 'Episode') return item.Name ?? undefined;
    return item.ProductionYear?.toString();
};

const Suggestions: FC<{ parentId?: string }> = ({ parentId }) => {
    const { data: suggestions } = useSearchSuggestions(parentId);
    const getItemLink = useItemLink();
    if (!suggestions?.length) return null;

    return (
        <section className='cinema-search__suggestions' aria-label={globalize.translate('Suggestions')}>
            <h2 className='cinema-row__title'>{globalize.translate('Suggestions')}</h2>
            <div className='cinema-chipgroup cinema-search__chips'>
                {suggestions.map(item => (
                    <Link
                        key={item.Id}
                        {...getItemLink(item as ItemDto)}
                        className='cinema-season cinema-glass cinema-focusable'
                    >
                        {item.Name}
                    </Link>
                ))}
            </div>
        </section>
    );
};

interface ResultsProps {
    query: string;
    parentId?: string;
    collectionType?: CollectionType;
}

const Results: FC<ResultsProps> = ({ query, parentId, collectionType }) => {
    const { data: sections, isPending } = useSearchItems(parentId, collectionType, query.trim());

    if (isPending) {
        return <MediaRow title={globalize.translate('Search')} isPending shape='poster' />;
    }

    if (!sections?.length) {
        return (
            <div className='cinema-library__empty'>
                <p>{globalize.translate('SearchResultsEmpty', query)}</p>
                {parentId && (
                    <Link
                        className='cinema-btn cinema-glass cinema-focusable'
                        to={`/search?query=${encodeURIComponent(query)}`}
                    >
                        {globalize.translate('RetryWithGlobalSearch')}
                    </Link>
                )}
            </div>
        );
    }

    return (
        <>
            {sections.map(section => {
                const items = section.items as ItemDto[];
                return (
                    <MediaRow
                        key={section.title}
                        title={globalize.translate(section.title)}
                        items={items}
                        shape={getSectionShape(items)}
                        getSubtitle={getResultSubtitle}
                        showProgress
                    />
                );
            })}
        </>
    );
};

const Search: FC = () => {
    const [ searchParams ] = useSearchParams();
    const parentId = searchParams.get('parentId') ?? undefined;
    const collectionType = (searchParams.get('collectionType') ?? undefined) as CollectionType | undefined;
    const [ query, setQuery ] = useSearchParam('query');
    const [ debouncedQuery ] = useDebounceValue(query, DEBOUNCE_MS);
    const inputRef = useRef<HTMLInputElement>(null);

    // Typing is the point of this page, so put the cursor in the field straight away
    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape' && query) {
            e.preventDefault();
            setQuery('');
        }
    };

    return (
        <div className='cinema-search'>
            <form
                className='cinema-search__field cinema-glass'
                role='search'
                onSubmit={e => e.preventDefault()}
            >
                <SearchIcon className='cinema-search__icon' aria-hidden='true' />
                <input
                    ref={inputRef}
                    type='search'
                    className='cinema-search__input'
                    placeholder={globalize.translate('Search')}
                    aria-label={globalize.translate('Search')}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    autoComplete='off'
                    spellCheck={false}
                />
                {query && (
                    <button
                        type='button'
                        className='cinema-iconbtn cinema-focusable'
                        aria-label={globalize.translate('Reset')}
                        onClick={() => {
                            setQuery('');
                            inputRef.current?.focus();
                        }}
                    >
                        <Close fontSize='small' />
                    </button>
                )}
            </form>

            <div className='cinema-rows cinema-search__results'>
                {debouncedQuery.trim() ?
                    <Results query={debouncedQuery} parentId={parentId} collectionType={collectionType} /> :
                    <Suggestions parentId={parentId} />}
            </div>
        </div>
    );
};

export default Search;
