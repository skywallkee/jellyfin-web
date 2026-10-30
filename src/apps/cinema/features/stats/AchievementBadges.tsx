import DarkMode from '@mui/icons-material/DarkMode';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Explore from '@mui/icons-material/Explore';
import Favorite from '@mui/icons-material/Favorite';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import LocalMovies from '@mui/icons-material/LocalMovies';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import Replay from '@mui/icons-material/Replay';
import Timer from '@mui/icons-material/Timer';
import Tv from '@mui/icons-material/Tv';
import classNames from 'classnames';
import React, { type CSSProperties, type FC, type ReactNode, useMemo } from 'react';

import globalize from 'lib/globalize';

import { type AchievementFacts, type AchievementKey, buildAchievements } from './achievements';

const ICONS: Record<AchievementKey, ReactNode> = {
    first: <PlayCircleOutline />,
    buff: <LocalMovies />,
    cinephile: <EmojiEvents />,
    binge: <Tv />,
    marathon: <Timer />,
    explorer: <Explore />,
    traveler: <HourglassEmpty />,
    owl: <DarkMode />,
    rewatcher: <Replay />,
    collector: <Favorite />
};

/** Badges for watching milestones: unlocked ones shine, the rest show how close they are. */
const AchievementBadges: FC<{ facts: AchievementFacts }> = ({ facts }) => {
    const achievements = useMemo(() => buildAchievements(facts), [ facts ]);
    const unlocked = achievements.filter(a => a.isUnlocked).length;

    return (
        <section className='cinema-stats__section cinema-achievements'>
            <h2 className='cinema-row__title'>
                {globalize.translate('CinemaAchievements')}
                <span className='cinema-row__count'>{globalize.translate('CinemaUnlockedOf', unlocked, achievements.length)}</span>
            </h2>
            <ul className='cinema-achievements__grid'>
                {achievements.map((achievement, index) => (
                    <li
                        key={achievement.key}
                        className={classNames('cinema-achievement cinema-glass', { 'is-unlocked': achievement.isUnlocked })}
                        style={{ '--cinema-i': index, '--cinema-share': achievement.progress } as CSSProperties}
                    >
                        <span className='cinema-achievement__medal' aria-hidden='true'>{ICONS[achievement.key]}</span>
                        <span className='cinema-achievement__name'>{globalize.translate(`CinemaBadge_${achievement.key}`)}</span>
                        <span className='cinema-achievement__desc'>{globalize.translate(`CinemaBadgeDesc_${achievement.key}`, achievement.goal)}</span>
                        {achievement.isUnlocked ?
                            <span className='cinema-achievement__state'>{globalize.translate('CinemaUnlocked')}</span> :
                            <span className='cinema-achievement__progress'>
                                <span className='cinema-achievement__track'><span /></span>
                                <span>{`${achievement.value.toLocaleString()} / ${achievement.goal.toLocaleString()}`}</span>
                            </span>}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default AchievementBadges;
