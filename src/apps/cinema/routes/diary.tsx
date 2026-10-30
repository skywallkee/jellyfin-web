import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import MenuBook from '@mui/icons-material/MenuBook';
import Replay from '@mui/icons-material/Replay';
import React, { type CSSProperties, type FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import { useDiary, useDiaryItems } from '../features/diary/api';
import { type DiaryEntry, MAX_STARS, STAR_STEP, getAverageStars, getRatingSpread, groupByMonth, parseDay } from '../features/diary/diary';
import { LogSheet } from '../features/diary/LogSheet';
import { StarsShown } from '../features/diary/Stars';
import { useHideLegacyView } from '../hooks/useHideLegacyView';
import { useItemLink } from '../hooks/useItemLink';
import { getPosterUrl } from '../utils/images';

const formatMonth = (month: string) => parseDay(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** Ten bars, half a star to five: how the user's ratings spread out. */
const RatingSpread: FC<{ entries: DiaryEntry[] }> = ({ entries }) => {
    const spread = getRatingSpread(entries);
    const most = Math.max(1, ...spread);
    return (
        <div className='cinema-diary__spread' aria-hidden='true'>
            {spread.map((count, i) => (
                <span
                    // Ten fixed buckets, one per half star
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className='cinema-diary__bar'
                    style={{ '--cinema-share': count / most, '--cinema-i': i } as CSSProperties}
                    title={`${(i + 1) * STAR_STEP}★ · ${count}`}
                />
            ))}
            <span className='cinema-diary__axis'>
                <span>½★</span>
                <span>{`${MAX_STARS}★`}</span>
            </span>
        </div>
    );
};

interface EntryRowProps {
    entry: DiaryEntry;
    item?: ItemDto;
    index: number;
    onEdit: () => void;
}

const EntryRow: FC<EntryRowProps> = ({ entry, item, index, onEdit }) => {
    const { api } = useApi();
    const getItemLink = useItemLink();
    const posterUrl = api && item ? getPosterUrl(api, item, 160) : undefined;
    const day = parseDay(entry.date);
    const poster = (
        <span className='cinema-diary__poster' style={posterUrl ? { backgroundImage: `url("${posterUrl}")` } : undefined} />
    );

    return (
        <li className='cinema-diary__entry' style={{ '--cinema-i': Math.min(index, 12) } as CSSProperties}>
            <span className='cinema-diary__day'>
                <span className='cinema-diary__date'>{day.getDate()}</span>
                <span className='cinema-diary__weekday'>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            </span>
            {item ? <Link {...getItemLink(item)} className='cinema-focusable' aria-label={entry.title}>{poster}</Link> : poster}
            <span className='cinema-diary__text'>
                <span className='cinema-diary__title'>
                    {entry.title}
                    {item?.ProductionYear && <span className='cinema-diary__year'>{item.ProductionYear}</span>}
                </span>
                <span className='cinema-diary__meta'>
                    {entry.stars > 0 && <StarsShown value={entry.stars} />}
                    {entry.isRewatch && (
                        <span className='cinema-diary__rewatch' title={globalize.translate('CinemaRewatch')}>
                            <Replay />
                        </span>
                    )}
                </span>
                {entry.note && <span className='cinema-diary__note'>{entry.note}</span>}
            </span>
            <button
                type='button'
                className='cinema-iconbtn cinema-focusable'
                onClick={onEdit}
                aria-label={globalize.translate('CinemaEditEntry')}
                title={globalize.translate('CinemaEditEntry')}
            >
                <EditNoteOutlined />
            </button>
        </li>
    );
};

/** The watch diary: everything logged, by month, with how the ratings spread out. */
const Diary: FC = () => {
    useHideLegacyView(true, globalize.translate('CinemaDiary'));
    const { entries } = useDiary();
    const { data: items } = useDiaryItems(entries);
    const [ editing, setEditing ] = useState<DiaryEntry>();
    const months = useMemo(() => groupByMonth(entries), [ entries ]);
    const average = getAverageStars(entries);
    const thisYear = String(new Date().getFullYear());
    const loggedThisYear = entries.filter(entry => entry.date.startsWith(thisYear)).length;

    return (
        <div className='cinema-history cinema-diary'>
            <header className='cinema-library__header cinema-diary__header'>
                <div>
                    <h1 className='cinema-library__title'>{globalize.translate('CinemaDiary')}</h1>
                    {entries.length > 0 && (
                        <p className='cinema-diary__summary'>
                            {[
                                globalize.translate('CinemaLoggedThisYear', loggedThisYear, thisYear),
                                average != null && globalize.translate('CinemaAverageStars', average.toFixed(1))
                            ].filter(Boolean).join(' · ')}
                        </p>
                    )}
                </div>
                {entries.length > 0 && <RatingSpread entries={entries} />}
            </header>

            {entries.length === 0 && (
                <div className='cinema-empty'>
                    <MenuBook className='cinema-empty__icon' />
                    <p className='cinema-empty__title'>{globalize.translate('CinemaDiaryEmpty')}</p>
                    <p className='cinema-empty__text'>{globalize.translate('CinemaDiaryEmptyHelp')}</p>
                </div>
            )}

            {months.map(({ month, entries: monthEntries }) => (
                <section key={month} className='cinema-history__day' aria-label={formatMonth(month)}>
                    <h2 className='cinema-row__title'>{formatMonth(month)}</h2>
                    <ol className='cinema-history__list cinema-diary__list'>
                        {monthEntries.map((entry, index) => (
                            <EntryRow
                                key={entry.id}
                                entry={entry}
                                item={items?.get(entry.itemId)}
                                index={index}
                                onEdit={() => setEditing(entry)}
                            />
                        ))}
                    </ol>
                </section>
            ))}

            {editing && <LogSheet entry={editing} item={items?.get(editing.itemId)} onClose={() => setEditing(undefined)} />}
        </div>
    );
};

export default Diary;
