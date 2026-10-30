import Bolt from '@mui/icons-material/Bolt';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Landscape from '@mui/icons-material/Landscape';
import LocalCafe from '@mui/icons-material/LocalCafe';
import NightsStay from '@mui/icons-material/NightsStay';
import Psychology from '@mui/icons-material/Psychology';
import SentimentVerySatisfied from '@mui/icons-material/SentimentVerySatisfied';
import Shuffle from '@mui/icons-material/Shuffle';
import React, { type ReactNode } from 'react';

import globalize from 'lib/globalize';

import type { MoodKey } from './api';

interface MoodOption {
    key: MoodKey;
    icon: ReactNode;
    /** Colour of the mood's tile and chip, as a hue. */
    hue: number;
}

export const MOODS: MoodOption[] = [
    { key: 'cozy', icon: <LocalCafe />, hue: 32 },
    { key: 'thrilling', icon: <Bolt />, hue: 0 },
    { key: 'funny', icon: <SentimentVerySatisfied />, hue: 52 },
    { key: 'mindbending', icon: <Psychology />, hue: 268 },
    { key: 'epic', icon: <Landscape />, hue: 200 },
    { key: 'heartfelt', icon: <FavoriteBorder />, hue: 335 },
    { key: 'spooky', icon: <NightsStay />, hue: 150 },
    { key: 'any', icon: <Shuffle />, hue: 230 }
];

export const getMoodLabel = (mood: MoodKey) => globalize.translate(`CinemaMood_${mood}`);
