import Close from '@mui/icons-material/Close';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Shuffle from '@mui/icons-material/Shuffle';
import classNames from 'classnames';
import React, { type CSSProperties, type FC, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import MyListButton from '../../components/MyListButton';
import { useItemLink } from '../../hooks/useItemLink';
import { useOverlay } from '../../hooks/useOverlay';
import { playItem } from '../../utils/actions';
import { getBackdropUrl, getLogoUrl } from '../../utils/images';
import { formatRuntime, getDisplayTitle } from '../../utils/items';
import { playSound } from '../../utils/sounds';

import { type MoodKey, type MoodPicks, type TimeKey, useMoodPicks } from './api';
import { MOODS, getMoodLabel } from './moods';

const TIME_KEYS: TimeKey[] = [ 'quick', 'hour', 'movie', 'binge' ];

/** Late at night there's rarely time for a whole film. */
const getDefaultTime = (): TimeKey => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 5 ? 'hour' : 'movie';
};

const getResultsLabel = (data?: MoodPicks) => {
    if (!data) return globalize.translate('CinemaLookingUp');
    if (!data.items.length) return globalize.translate('CinemaMoodNothing');
    return globalize.translate(data.isRelaxed ? 'CinemaMoodRelaxed' : 'CinemaMoodPicks');
};

const PickCard: FC<{ item: ItemDto; index: number; onLeave: () => void }> = ({ item, index, onLeave }) => {
    const { api } = useApi();
    const getItemLink = useItemLink();
    const backdropUrl = api ? getBackdropUrl(api, item, 960) : undefined;
    const logoUrl = api && item.ImageTags?.Logo ? getLogoUrl(api, item, 400) : undefined;
    const meta = [
        item.ProductionYear,
        item.Type === 'Series' ? globalize.translate('CinemaEpisodeLength', formatRuntime(item.RunTimeTicks)) : formatRuntime(item.RunTimeTicks),
        item.Genres?.slice(0, 2).join(' · ')
    ].filter(Boolean).join(' · ');

    return (
        <article className='cinema-mood__pick' style={{ '--cinema-i': index } as CSSProperties}>
            <div className='cinema-mood__art' style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}>
                {logoUrl ?
                    <img className='cinema-mood__logo' src={logoUrl} alt={getDisplayTitle(item)} /> :
                    <h3 className='cinema-mood__name'>{getDisplayTitle(item)}</h3>}
            </div>
            <div className='cinema-mood__body'>
                {meta && <p className='cinema-mood__meta'>{meta}</p>}
                {item.Overview && <p className='cinema-mood__overview'>{item.Overview}</p>}
                <div className='cinema-actions'>
                    <button
                        type='button'
                        className='cinema-btn cinema-btn--primary cinema-focusable'
                        onClick={() => {
                            onLeave();
                            playItem(item, false);
                        }}
                    >
                        <PlayArrow />
                        {globalize.translate('Play')}
                    </button>
                    <Link
                        {...getItemLink(item)}
                        className='cinema-btn cinema-btn--round cinema-glass cinema-focusable'
                        onClick={onLeave}
                        aria-label={globalize.translate('ButtonInfo')}
                        title={globalize.translate('ButtonInfo')}
                    >
                        <InfoOutlined />
                    </Link>
                    <MyListButton item={item} />
                </div>
            </div>
        </article>
    );
};

const Picks: FC<{ mood: MoodKey; time: TimeKey; onLeave: () => void }> = ({ mood, time, onLeave }) => {
    const [ round, setRound ] = useState(0);
    const { data, isFetching } = useMoodPicks(mood, time, round);

    return (
        <section className='cinema-mood__results' aria-live='polite' aria-busy={isFetching}>
            <div className='cinema-mood__resultshead'>
                <p className='cinema-settings__label'>{getResultsLabel(data)}</p>
                <button
                    type='button'
                    className='cinema-btn cinema-glass cinema-focusable'
                    onClick={() => {
                        playSound('move');
                        setRound(current => current + 1);
                    }}
                    disabled={isFetching}
                >
                    <Shuffle />
                    {globalize.translate('CinemaMoodAgain')}
                </button>
            </div>
            <div key={`${mood}-${time}-${round}`} className={classNames('cinema-mood__picks', { 'is-loading': isFetching && !data })}>
                {!data && Array.from({ length: 3 }, (_, i) => (
                    <span key={i} className='cinema-mood__pick cinema-skeleton' />
                ))}
                {data?.items.map((item, index) => <PickCard key={item.Id} item={item} index={index} onLeave={onLeave} />)}
            </div>
        </section>
    );
};

interface MoodPickerProps {
    initialMood?: MoodKey;
    onClose: () => void;
}

/** "What's the vibe?": pick the time you have and a mood, get three unwatched titles that fit. */
const MoodPicker: FC<MoodPickerProps> = ({ initialMood, onClose }) => {
    const [ mood, setMood ] = useState<MoodKey | undefined>(initialMood);
    const [ time, setTime ] = useState<TimeKey>(getDefaultTime);
    useOverlay(true, onClose);

    return (
        <div className='cinema-smart cinema-mood' role='dialog' aria-modal='true' aria-label={globalize.translate('CinemaMoodTitle')}>
            <button type='button' className='cinema-qs__scrim' tabIndex={-1} aria-hidden='true' onClick={onClose} />
            <div className='cinema-smart__panel cinema-mood__panel cinema-glass'>
                <header className='cinema-smart__header'>
                    <div>
                        <p className='cinema-endscreen__heading'>{globalize.translate('CinemaTonight')}</p>
                        <h2>{globalize.translate('CinemaMoodTitle')}</h2>
                    </div>
                    <button type='button' className='cinema-iconbtn cinema-focusable' onClick={onClose} aria-label={globalize.translate('ButtonClose')}>
                        <Close />
                    </button>
                </header>

                <div className='cinema-smart__field'>
                    <span className='cinema-settings__label'>{globalize.translate('CinemaMoodTimeQuestion')}</span>
                    <div className='cinema-chipgroup cinema-smart__chips' role='group'>
                        {TIME_KEYS.map(key => (
                            <button
                                key={key}
                                type='button'
                                className={classNames('cinema-season cinema-focusable', { 'is-active': key === time })}
                                aria-pressed={key === time}
                                onClick={() => setTime(key)}
                            >
                                {globalize.translate(`CinemaTime_${key}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className='cinema-smart__field'>
                    <span className='cinema-settings__label'>{globalize.translate('CinemaMoodQuestion')}</span>
                    <div className='cinema-mood__tiles' role='group'>
                        {MOODS.map(option => (
                            <button
                                key={option.key}
                                type='button'
                                className={classNames('cinema-mood__tile cinema-focusable', { 'is-active': option.key === mood })}
                                style={{ '--cinema-hue': option.hue } as CSSProperties}
                                aria-pressed={option.key === mood}
                                onClick={() => {
                                    playSound('select');
                                    setMood(option.key);
                                }}
                            >
                                {option.icon}
                                <span>{getMoodLabel(option.key)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {mood && <Picks mood={mood} time={time} onLeave={onClose} />}
            </div>
        </div>
    );
};

export default MoodPicker;
