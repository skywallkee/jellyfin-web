import Mic from '@mui/icons-material/Mic';
import classNames from 'classnames';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';

import { useVoiceSearch } from '../hooks/useVoiceSearch';

/** A microphone button for a search field; pulses while listening. Hidden where speech isn't supported. */
const VoiceButton: FC<{ onText: (text: string) => void }> = ({ onText }) => {
    const { isSupported, isListening, toggle } = useVoiceSearch(onText);
    if (!isSupported) return null;

    const label = globalize.translate(isListening ? 'CinemaListening' : 'CinemaVoiceSearch');
    return (
        <button
            type='button'
            className={classNames('cinema-iconbtn cinema-focusable cinema-voice', { 'is-listening': isListening })}
            onClick={toggle}
            aria-pressed={isListening}
            aria-label={label}
            title={label}
        >
            <Mic fontSize='small' />
        </button>
    );
};

export default VoiceButton;
