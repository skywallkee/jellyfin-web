import Add from '@mui/icons-material/Add';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Close from '@mui/icons-material/Close';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import classNames from 'classnames';
import React, { type FC, type ReactNode, useState } from 'react';

import globalize from 'lib/globalize';

import MediaCard from '../../components/MediaCard';
import ScrollTrack from '../../components/ScrollTrack';
import { useOverlay } from '../../hooks/useOverlay';
import { isMostlyWide } from '../../utils/images';

import {
    NEW_SMART_ROW,
    type SmartKind,
    type SmartRow,
    type SmartSort,
    describeSmartRow,
    useAllTitleGenres,
    useSmartRowItems,
    useSmartRows
} from './api';

const KINDS: { key: SmartKind; labelKey: string }[] = [
    { key: 'all', labelKey: 'CinemaTitles' },
    { key: 'movies', labelKey: 'Movies' },
    { key: 'shows', labelKey: 'Shows' }
];
const DECADES = [ 1960, 1970, 1980, 1990, 2000, 2010, 2020 ];
const RATINGS = [ 6, 7, 8 ];
const RUNTIMES = [ 30, 60, 90, 120 ];
const getMatchLabel = (count: number) => (count === 1 ? globalize.translate('CinemaMatch') : globalize.translate('CinemaMatches', count));
const SORTS: { key: SmartSort; labelKey: string }[] = [
    { key: 'random', labelKey: 'CinemaSurpriseOrder' },
    { key: 'rating', labelKey: 'CinemaHighestRated' },
    { key: 'newest', labelKey: 'CinemaNewestReleases' },
    { key: 'added', labelKey: 'CinemaRecentlyAdded' }
];

interface ChipProps {
    isActive: boolean;
    onClick: () => void;
    children: ReactNode;
}

const Chip: FC<ChipProps> = ({ isActive, onClick, children }) => (
    <button
        type='button'
        className={classNames('cinema-season cinema-focusable', { 'is-active': isActive })}
        aria-pressed={isActive}
        onClick={onClick}
    >
        {children}
    </button>
);

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <div className='cinema-smart__field'>
        <span className='cinema-settings__label'>{label}</span>
        <div className='cinema-chipgroup cinema-smart__chips'>{children}</div>
    </div>
);

/** The rules form, with a live preview of what the row will show. */
const RowForm: FC<{ initial: Omit<SmartRow, 'id'>; onSave: (row: Omit<SmartRow, 'id'>) => void; onCancel: () => void }> = ({ initial, onSave, onCancel }) => {
    const [ row, setRow ] = useState(initial);
    const { data: genres } = useAllTitleGenres();
    const { data: preview, isFetching } = useSmartRowItems(row);
    const set = (changes: Partial<SmartRow>) => setRow(current => ({ ...current, ...changes }));
    const toggleGenre = (genre: string) => set({
        genres: row.genres.includes(genre) ? row.genres.filter(g => g !== genre) : [ ...row.genres, genre ]
    });

    return (
        <div className='cinema-smart__form'>
            <label className='cinema-smart__field'>
                <span className='cinema-settings__label'>{globalize.translate('LabelName')}</span>
                <input
                    className='cinema-smart__name'
                    value={row.name ?? ''}
                    placeholder={describeSmartRow({ ...row, name: '' })}
                    onChange={e => set({ name: e.target.value })}
                />
            </label>
            <Field label={globalize.translate('CinemaShow')}>
                {KINDS.map(kind => (
                    <Chip key={kind.key} isActive={row.kind === kind.key} onClick={() => set({ kind: kind.key })}>{globalize.translate(kind.labelKey)}</Chip>
                ))}
                <Chip isActive={row.unwatchedOnly} onClick={() => set({ unwatchedOnly: !row.unwatchedOnly })}>{globalize.translate('CinemaUnwatchedOnly')}</Chip>
            </Field>
            {genres && genres.length > 0 && (
                <Field label={globalize.translate('Genres')}>
                    {genres.map(genre => (
                        <Chip key={genre} isActive={row.genres.includes(genre)} onClick={() => toggleGenre(genre)}>{genre}</Chip>
                    ))}
                </Field>
            )}
            <Field label={globalize.translate('CinemaReleased')}>
                <Chip isActive={!row.decade} onClick={() => set({ decade: undefined })}>{globalize.translate('CinemaAnyTime')}</Chip>
                {DECADES.map(decade => (
                    <Chip key={decade} isActive={row.decade === decade} onClick={() => set({ decade })}>{`${decade}s`}</Chip>
                ))}
            </Field>
            <Field label={globalize.translate('CommunityRating')}>
                <Chip isActive={!row.minRating} onClick={() => set({ minRating: undefined })}>{globalize.translate('CinemaAny')}</Chip>
                {RATINGS.map(rating => (
                    <Chip key={rating} isActive={row.minRating === rating} onClick={() => set({ minRating: rating })}>{`★ ${rating}+`}</Chip>
                ))}
            </Field>
            <Field label={globalize.translate('CinemaLength')}>
                <Chip isActive={!row.maxMinutes} onClick={() => set({ maxMinutes: undefined })}>{globalize.translate('CinemaAny')}</Chip>
                {RUNTIMES.map(minutes => (
                    <Chip key={minutes} isActive={row.maxMinutes === minutes} onClick={() => set({ maxMinutes: minutes })}>
                        {globalize.translate('CinemaUnderMinutes', minutes)}
                    </Chip>
                ))}
            </Field>
            <Field label={globalize.translate('LabelSortBy')}>
                {SORTS.map(sort => (
                    <Chip key={sort.key} isActive={row.sort === sort.key} onClick={() => set({ sort: sort.key })}>{globalize.translate(sort.labelKey)}</Chip>
                ))}
            </Field>

            <div className='cinema-smart__preview'>
                <span className='cinema-settings__label'>
                    {isFetching ? globalize.translate('CinemaLookingUp') : getMatchLabel(preview?.length ?? 0)}
                </span>
                {preview && preview.length > 0 ?
                    <ScrollTrack className='cinema-row__track cinema-smart__track'>
                        {preview.map((item, index) => (
                            <MediaCard key={item.Id} item={item} index={index} shape={isMostlyWide(preview) ? 'landscape' : 'poster'} />
                        ))}
                    </ScrollTrack> :
                    !isFetching && <p className='cinema-smart__nothing'>{globalize.translate('CinemaNoMatches')}</p>}
            </div>

            <div className='cinema-actions'>
                <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable' onClick={() => onSave(row)}>
                    {globalize.translate('Save')}
                </button>
                <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={onCancel}>
                    {globalize.translate('ButtonCancel')}
                </button>
            </div>
        </div>
    );
};

/**
 * Builds and arranges smart rows: home rows defined by rules ("unwatched 90s sci-fi rated 7+"),
 * that fill themselves and stay up to date. Saved to the user's account.
 */
const SmartRowsEditor: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { rows, save } = useSmartRows();
    // Which row the form is open for: an id, 'new', or none
    const [ editing, setEditing ] = useState<string | undefined>(rows.length ? undefined : 'new');
    useOverlay(true, editing ? () => setEditing(undefined) : onClose);

    const move = (index: number, step: number) => {
        const next = [ ...rows ];
        const [ row ] = next.splice(index, 1);
        next.splice(index + step, 0, row);
        save(next);
    };

    const onSave = (row: Omit<SmartRow, 'id'>) => {
        if (editing === 'new') save([ ...rows, { ...row, id: `${Date.now()}` } ]);
        else save(rows.map(existing => (existing.id === editing ? { ...row, id: existing.id } : existing)));
        setEditing(undefined);
    };

    const editingRow = editing === 'new' ? NEW_SMART_ROW : rows.find(row => row.id === editing);

    return (
        <div className='cinema-smart' role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaSmartRows')}>
            <button type='button' className='cinema-qs__scrim' tabIndex={-1} aria-hidden='true' onClick={onClose} />
            <div className='cinema-smart__panel cinema-glass'>
                <header className='cinema-smart__header'>
                    <div>
                        <h2>{globalize.translate('CinemaSmartRows')}</h2>
                        <p>{globalize.translate('CinemaSmartRowsHelp')}</p>
                    </div>
                    <button type='button' className='cinema-iconbtn cinema-focusable' onClick={onClose} aria-label={globalize.translate('ButtonClose')}>
                        <Close />
                    </button>
                </header>

                {editingRow ?
                    <RowForm key={editing} initial={editingRow} onSave={onSave} onCancel={() => setEditing(undefined)} /> :
                    <>
                        <ol className='cinema-smart__list'>
                            {rows.map((row, index) => (
                                <li key={row.id} className='cinema-smart__item'>
                                    <span className='cinema-smart__itemname'>{describeSmartRow(row)}</span>
                                    <button type='button' className='cinema-iconbtn cinema-focusable' disabled={index === 0} onClick={() => move(index, -1)} aria-label={globalize.translate('CinemaMoveUp')}>
                                        <ArrowUpward fontSize='small' />
                                    </button>
                                    <button type='button' className='cinema-iconbtn cinema-focusable' disabled={index === rows.length - 1} onClick={() => move(index, 1)} aria-label={globalize.translate('CinemaMoveDown')}>
                                        <ArrowDownward fontSize='small' />
                                    </button>
                                    <button type='button' className='cinema-iconbtn cinema-focusable' onClick={() => setEditing(row.id)} aria-label={globalize.translate('Edit')}>
                                        <EditOutlined fontSize='small' />
                                    </button>
                                    <button type='button' className='cinema-iconbtn cinema-focusable' onClick={() => save(rows.filter(other => other.id !== row.id))} aria-label={globalize.translate('Delete')}>
                                        <DeleteOutline fontSize='small' />
                                    </button>
                                </li>
                            ))}
                        </ol>
                        <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable' onClick={() => setEditing('new')}>
                            <Add />
                            {globalize.translate('CinemaNewSmartRow')}
                        </button>
                    </>}
            </div>
        </div>
    );
};

export default SmartRowsEditor;
