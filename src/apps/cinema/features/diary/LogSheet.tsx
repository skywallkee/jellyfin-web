import Close from '@mui/icons-material/Close';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import Replay from '@mui/icons-material/Replay';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useOverlay } from '../../hooks/useOverlay';
import { getPosterUrl } from '../../utils/images';
import { getDisplayTitle } from '../../utils/items';
import { playSound } from '../../utils/sounds';

import { useDiary, useItemDiary } from './api';
import { type DiaryEntry, MAX_NOTE, getToday, makeEntryId } from './diary';
import { StarsInput, StarsShown } from './Stars';

interface LogSheetProps {
    /** The title being logged (for a new entry) or that the entry is about. */
    item?: ItemDto;
    /** An existing entry to change; otherwise a new one is made. */
    entry?: DiaryEntry;
    onClose: () => void;
}

/** Log a watch: the day, stars, a few words, and whether it was a rewatch. */
export const LogSheet: FC<LogSheetProps> = ({ item, entry, onClose }) => {
    const { api } = useApi();
    const { save, remove } = useDiary();
    const earlier = useItemDiary(item?.Id ?? entry?.itemId);
    const [ date, setDate ] = useState(entry?.date ?? getToday());
    const [ stars, setStars ] = useState(entry?.stars ?? 0);
    const [ note, setNote ] = useState(entry?.note ?? '');
    // Logged before, or watched before (more than once): most likely a rewatch
    const [ isRewatch, setIsRewatch ] = useState(entry?.isRewatch ?? (earlier.length > 0 || (item?.UserData?.PlayCount ?? 0) > 1));
    const starsRef = useRef<HTMLDivElement>(null);
    useOverlay(true, onClose);

    useEffect(() => {
        starsRef.current?.querySelector<HTMLElement>('[role=slider]')?.focus({ preventScroll: true });
    }, []);

    const title = entry?.title ?? (item ? getDisplayTitle(item) : '');
    const posterUrl = api && item ? getPosterUrl(api, item, 200) : undefined;

    const onSave = () => {
        const itemId = entry?.itemId ?? item?.Id;
        if (!itemId) return;
        save({
            id: entry?.id ?? makeEntryId(),
            itemId,
            title,
            date: date || getToday(),
            stars,
            note: note.trim() || undefined,
            isRewatch: isRewatch || undefined
        });
        playSound('select');
        onClose();
    };

    return createPortal(
        <div className='cinema-smart cinema-log' role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaLogTitle', title)}>
            <button type='button' className='cinema-qs__scrim' tabIndex={-1} aria-hidden='true' onClick={onClose} />
            <div className='cinema-smart__panel cinema-log__panel cinema-glass'>
                <header className='cinema-smart__header'>
                    <div className='cinema-log__head'>
                        {posterUrl && <span className='cinema-log__poster' style={{ backgroundImage: `url("${posterUrl}")` }} />}
                        <div>
                            <p className='cinema-endscreen__heading'>{globalize.translate(entry ? 'CinemaEditEntry' : 'CinemaLogIt')}</p>
                            <h2>{title}</h2>
                        </div>
                    </div>
                    <button type='button' className='cinema-iconbtn cinema-focusable' onClick={onClose} aria-label={globalize.translate('ButtonClose')}>
                        <Close />
                    </button>
                </header>

                <div ref={starsRef} className='cinema-smart__field'>
                    <span className='cinema-settings__label'>{globalize.translate('CinemaYourRating')}</span>
                    <StarsInput value={stars} onChange={setStars} />
                </div>

                <div className='cinema-log__row'>
                    <label className='cinema-smart__field'>
                        <span className='cinema-settings__label'>{globalize.translate('CinemaWatchedOn')}</span>
                        <input
                            type='date'
                            className='cinema-smart__name cinema-log__date'
                            value={date}
                            max={getToday()}
                            onChange={e => setDate(e.target.value)}
                        />
                    </label>
                    <button
                        type='button'
                        role='switch'
                        aria-checked={isRewatch}
                        className={classNames('cinema-season cinema-focusable cinema-log__rewatch', { 'is-active': isRewatch })}
                        onClick={() => setIsRewatch(current => !current)}
                    >
                        <Replay />
                        {globalize.translate('CinemaRewatch')}
                    </button>
                </div>

                <label className='cinema-smart__field'>
                    <span className='cinema-settings__label'>{globalize.translate('CinemaYourThoughts')}</span>
                    <textarea
                        className='cinema-smart__name cinema-log__note'
                        value={note}
                        maxLength={MAX_NOTE}
                        rows={4}
                        placeholder={globalize.translate('CinemaThoughtsPlaceholder')}
                        onChange={e => setNote(e.target.value)}
                    />
                    <span className='cinema-log__count'>{`${note.length} / ${MAX_NOTE}`}</span>
                </label>

                <div className='cinema-actions'>
                    <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable' onClick={onSave}>
                        {globalize.translate('Save')}
                    </button>
                    <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={onClose}>
                        {globalize.translate('ButtonCancel')}
                    </button>
                    {entry && (
                        <button
                            type='button'
                            className='cinema-btn cinema-glass cinema-focusable cinema-log__delete'
                            onClick={() => {
                                remove(entry.id);
                                onClose();
                            }}
                        >
                            {globalize.translate('Delete')}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const LOGGABLE_TYPES = new Set([ 'Movie', 'Series', 'Episode', 'Video', 'MusicVideo' ]);

/** "Log it" for a title: shows your latest stars once logged, and opens the log sheet. */
export const DiaryButton: FC<{ item: ItemDto; showLabel?: boolean }> = ({ item, showLabel }) => {
    const [ isOpen, setIsOpen ] = useState(false);
    const [ latest ] = useItemDiary(item.Id);
    if (!LOGGABLE_TYPES.has(item.Type ?? '')) return null;

    const label = globalize.translate(latest ? 'CinemaLogAgain' : 'CinemaLogIt');
    return (
        <>
            <button
                type='button'
                className={classNames('cinema-btn cinema-glass cinema-focusable cinema-diary-btn', {
                    'cinema-btn--round': !showLabel && !latest?.stars,
                    'is-logged': Boolean(latest)
                })}
                onClick={() => setIsOpen(true)}
                aria-label={label}
                title={label}
            >
                <EditNoteOutlined />
                {latest && latest.stars > 0 && <StarsShown value={latest.stars} className='cinema-stars--small' />}
                {showLabel && !latest?.stars && label}
            </button>
            {isOpen && <LogSheet item={item} onClose={() => setIsOpen(false)} />}
        </>
    );
};
