import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getLibraryApi } from '@jellyfin/sdk/lib/utils/api/library-api';
import History from '@mui/icons-material/History';
import KeyboardReturn from '@mui/icons-material/KeyboardReturn';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounceValue } from 'usehooks-ts';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useItemLink } from '../hooks/useItemLink';
import { useOverlay } from '../hooks/useOverlay';
import { getPosterUrl } from '../utils/images';
import { getDisplayTitle, getEpisodeLabel } from '../utils/items';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '../utils/recentSearches';
import { playSound } from '../utils/sounds';

import VoiceButton from './VoiceButton';

const DEBOUNCE_MS = 150;
const RESULT_LIMIT = 8;
const RESULT_TYPES = [ BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Episode, BaseItemKind.Video, BaseItemKind.BoxSet ];

const useQuickResults = (query: string) => {
    const { api, user } = useApi();
    const term = query.trim();
    return useQuery({
        queryKey: [ 'User', user?.Id, 'Cinema', 'QuickSearch', term ],
        queryFn: async ({ signal }) => {
            const response = await getLibraryApi(api!).getItems({
                userId: user?.Id,
                searchTerm: term,
                recursive: true,
                includeItemTypes: RESULT_TYPES,
                limit: RESULT_LIMIT,
                enableImageTypes: [ ImageType.Primary ],
                imageTypeLimit: 1,
                enableUserData: false
            }, { signal });
            return (response.data.Items ?? []) as ItemDto[];
        },
        enabled: !!api && !!user?.Id && term.length > 0,
        placeholderData: previous => previous
    });
};

/** The title with the part matching the query picked out. */
const Highlighted: FC<{ text: string; query: string }> = ({ text, query }) => {
    const at = query ? text.toLowerCase().indexOf(query.trim().toLowerCase()) : -1;
    if (at < 0) return <span>{text}</span>;
    const end = at + query.trim().length;
    return <span>{text.slice(0, at)}<mark>{text.slice(at, end)}</mark>{text.slice(end)}</span>;
};

const getResultLine = (item: ItemDto) => [
    item.Type === 'Episode' ? [ getEpisodeLabel(item), item.Name ].filter(Boolean).join(' · ') : undefined,
    item.ProductionYear?.toString(),
    globalize.translate(item.Type === 'Series' ? 'Series' : item.Type ?? '')
].filter(Boolean).join(' · ');

interface PaletteProps {
    onClose: () => void;
}

/** The quick search palette itself: field, recent searches and instant results. Loaded on first use. */
const Palette: FC<PaletteProps> = ({ onClose }) => {
    const { api } = useApi();
    const navigate = useNavigate();
    const getItemLink = useItemLink();
    const [ query, setQuery ] = useState('');
    const [ debouncedQuery ] = useDebounceValue(query, DEBOUNCE_MS);
    const [ activeIndex, setActiveIndex ] = useState(0);
    const [ recent, setRecent ] = useState(getRecentSearches);
    const inputRef = useRef<HTMLInputElement>(null);
    const { data: results, isFetching } = useQuickResults(debouncedQuery);

    const hasQuery = query.trim().length > 0;
    const items = hasQuery ? results ?? [] : [];
    // The last option is always "See all results" while there's a query
    const optionCount = hasQuery ? items.length + 1 : recent.length;

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Escape / Back close the palette (and only the palette, even over a details card)
    useOverlay(true, onClose);

    useEffect(() => setActiveIndex(0), [ debouncedQuery ]);

    const openItem = (item: ItemDto) => {
        addRecentSearch(query);
        playSound('select');
        const { to, state } = getItemLink(item);
        onClose();
        navigate(to, { state });
    };

    const openFullSearch = () => {
        addRecentSearch(query);
        onClose();
        navigate(`/search?query=${encodeURIComponent(query.trim())}`);
    };

    const choose = (index: number) => {
        // Still showing results for what was typed a moment ago: search for what's typed now instead
        if (hasQuery && query.trim() !== debouncedQuery.trim()) {
            openFullSearch();
            return;
        }
        if (!hasQuery) {
            const entry = recent[index];
            if (entry) setQuery(entry);
            return;
        }
        const item = items[index];
        if (item) openItem(item);
        else openFullSearch();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (!optionCount) return;
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActiveIndex(i => (i + step + optionCount) % optionCount);
            playSound('move');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(activeIndex);
        }
    };

    const optionId = (index: number) => `cinema-qs-option-${index}`;

    return (
        <div className='cinema-qs' role='dialog' aria-modal='true' aria-label={globalize.translate('Search')}>
            <button type='button' className='cinema-qs__scrim' tabIndex={-1} aria-hidden='true' onClick={onClose} />
            {/* Keys are handled for the whole palette, which only holds the field and its options */}
            <div className='cinema-qs__panel cinema-glass' role='presentation' onKeyDown={onKeyDown}>
                <div className={classNames('cinema-qs__field', { 'is-busy': isFetching })}>
                    <SearchIcon aria-hidden='true' />
                    <input
                        ref={inputRef}
                        // Plain text, so browsers don't add their own clear button next to the Esc hint
                        type='text'
                        inputMode='search'
                        enterKeyHint='search'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={globalize.translate('CinemaQuickSearchPlaceholder')}
                        aria-label={globalize.translate('Search')}
                        role='combobox'
                        aria-expanded={optionCount > 0}
                        aria-controls='cinema-qs-options'
                        aria-activedescendant={optionCount ? optionId(activeIndex) : undefined}
                        autoComplete='off'
                        spellCheck={false}
                    />
                    <VoiceButton onText={setQuery} />
                    <kbd className='cinema-kbd'>Esc</kbd>
                </div>

                {!hasQuery && recent.length > 0 && (
                    <div className='cinema-qs__heading'>
                        {globalize.translate('CinemaRecentSearches')}
                        <button
                            type='button'
                            className='cinema-textbtn'
                            onClick={() => {
                                clearRecentSearches();
                                setRecent([]);
                                inputRef.current?.focus();
                            }}
                        >
                            {globalize.translate('CinemaClear')}
                        </button>
                    </div>
                )}

                <ul id='cinema-qs-options' className='cinema-qs__options' role='listbox' aria-label={globalize.translate('Search')}>
                    {!hasQuery && recent.map((entry, index) => (
                        // Options are picked with the arrow keys from the field, or with a click
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                        <li
                            key={entry}
                            id={optionId(index)}
                            role='option'
                            aria-selected={index === activeIndex}
                            className={classNames('cinema-qs__option cinema-qs__option--recent', { 'is-active': index === activeIndex })}
                            onClick={() => choose(index)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            <History fontSize='small' aria-hidden='true' />
                            <span className='cinema-qs__title'>{entry}</span>
                        </li>
                    ))}

                    {items.map((item, index) => {
                        const posterUrl = api ? getPosterUrl(api, item, 96) : undefined;
                        return (
                            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                            <li
                                key={item.Id}
                                id={optionId(index)}
                                role='option'
                                aria-selected={index === activeIndex}
                                className={classNames('cinema-qs__option', { 'is-active': index === activeIndex })}
                                onClick={() => choose(index)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <span
                                    className='cinema-qs__thumb'
                                    style={posterUrl ? { backgroundImage: `url("${posterUrl}")` } : undefined}
                                />
                                <span className='cinema-qs__text'>
                                    <span className='cinema-qs__title'>
                                        <Highlighted text={getDisplayTitle(item)} query={debouncedQuery} />
                                    </span>
                                    <span className='cinema-qs__line'>{getResultLine(item)}</span>
                                </span>
                                {index === activeIndex && <KeyboardReturn className='cinema-qs__enter' fontSize='small' aria-hidden='true' />}
                            </li>
                        );
                    })}

                    {hasQuery && (
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                        <li
                            id={optionId(items.length)}
                            role='option'
                            aria-selected={activeIndex === items.length}
                            className={classNames('cinema-qs__option cinema-qs__option--all', { 'is-active': activeIndex === items.length })}
                            onClick={() => choose(items.length)}
                            onMouseEnter={() => setActiveIndex(items.length)}
                        >
                            <SearchIcon fontSize='small' aria-hidden='true' />
                            <span className='cinema-qs__title'>{globalize.translate('CinemaSeeAllResults', query.trim())}</span>
                        </li>
                    )}
                </ul>

                {hasQuery && !isFetching && results && results.length === 0 && (
                    <p className='cinema-qs__empty'>{globalize.translate('SearchResultsEmpty', query.trim())}</p>
                )}
            </div>
        </div>
    );
};

export default Palette;
