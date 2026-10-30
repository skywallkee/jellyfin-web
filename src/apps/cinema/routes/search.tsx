import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import type { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { getGenreApi } from '@jellyfin/sdk/lib/utils/api/genre-api';
import Close from '@mui/icons-material/Close';
import History from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import React, { type CSSProperties, type FC, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';

import { useSearchItems } from 'apps/legacy/features/search/api/useSearchItems';
import { useSearchSuggestions } from 'apps/legacy/features/search/api/useSearchSuggestions';
import useSearchParam from 'hooks/useSearchParam';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import type { CardShape } from '../components/MediaCard';
import MediaRow from '../components/MediaRow';
import RequestPrompt from '../components/RequestPrompt';
import VoiceButton from '../components/VoiceButton';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { useItemLink } from '../hooks/useItemLink';
import { getGenreHue } from '../utils/genre';
import { isMostlyWide } from '../utils/images';
import { addRecentSearch, getRecentSearches } from '../utils/recentSearches';

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

const GENRE_LIMIT = 24;

const useAllGenres = (parentId?: string) => {
    const { api, user } = useApi();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'AllGenres', parentId ],
        queryFn: async ({ signal }) => {
            const response = await getGenreApi(api!).getGenres({
                userId: user?.Id,
                parentId,
                includeItemTypes: [ BaseItemKind.Movie, BaseItemKind.Series ],
                sortBy: [ ItemSortBy.SortName ],
                limit: GENRE_LIMIT,
                enableImages: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id
    });
};

/** Colourful tiles to browse by genre when nothing has been typed yet. */
const GenreTiles: FC<{ parentId?: string }> = ({ parentId }) => {
    const { data: genres } = useAllGenres(parentId);
    const getItemLink = useItemLink();
    if (!genres?.length) return null;

    return (
        <section className='cinema-search__genres' aria-label={globalize.translate('Genres')}>
            <h2 className='cinema-row__title'>{globalize.translate('CinemaBrowseGenres')}</h2>
            <div className='cinema-genres cinema-stagger is-visible'>
                {genres.map((genre, index) => (
                    <Link
                        key={genre.Id}
                        {...getItemLink(genre)}
                        className='cinema-genre cinema-focusable'
                        style={{ '--cinema-hue': getGenreHue(genre.Name ?? ''), '--cinema-i': Math.min(index, 12) } as CSSProperties}
                    >
                        {genre.Name}
                    </Link>
                ))}
            </div>
        </section>
    );
};

/** Searches made earlier in this browser, one click to run again. */
const RecentSearches: FC<{ onPick: (query: string) => void }> = ({ onPick }) => {
    const [ recent ] = useState(getRecentSearches);
    if (!recent.length) return null;

    return (
        <section className='cinema-search__suggestions' aria-label={globalize.translate('CinemaRecentSearches')}>
            <h2 className='cinema-row__title'>{globalize.translate('CinemaRecentSearches')}</h2>
            <div className='cinema-chipgroup cinema-search__chips'>
                {recent.map(entry => (
                    <button
                        key={entry}
                        type='button'
                        className='cinema-season cinema-glass cinema-focusable'
                        onClick={() => onPick(entry)}
                    >
                        <History fontSize='small' aria-hidden='true' />
                        {entry}
                    </button>
                ))}
            </div>
        </section>
    );
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
                <RequestPrompt query={query} />
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
    useHideLegacyView(true, globalize.translate('Search'));
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

    // Remember a search once the user has settled on it (it found something and they paused)
    const latestQueryRef = useRef(debouncedQuery);
    latestQueryRef.current = debouncedQuery;
    useEffect(() => () => addRecentSearch(latestQueryRef.current), []);

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
                onSubmit={e => {
                    e.preventDefault();
                    addRecentSearch(query);
                }}
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
                <VoiceButton onText={setQuery} />
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
                    <>
                        <RecentSearches onPick={setQuery} />
                        <Suggestions parentId={parentId} />
                        <GenreTiles parentId={parentId} />
                    </>}
            </div>
        </div>
    );
};

export default Search;
