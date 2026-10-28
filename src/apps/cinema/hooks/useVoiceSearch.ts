import { useCallback, useEffect, useRef, useState } from 'react';

import globalize from 'lib/globalize';

/** The parts of the browser's speech recognition used here (not in every TypeScript DOM library). */
interface Recognition {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

const getRecognition = (): RecognitionConstructor | undefined => {
    if (typeof window === 'undefined') return undefined;
    const speechWindow = window as unknown as {
        SpeechRecognition?: RecognitionConstructor;
        webkitSpeechRecognition?: RecognitionConstructor;
    };
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
};

/**
 * Search by speaking: the words appear in the field as they're recognised. Only offered
 * where the browser supports speech recognition (Chrome, Edge, Safari, Android TV browsers).
 */
export const useVoiceSearch = (onText: (text: string) => void) => {
    const [ isListening, setIsListening ] = useState(false);
    const recognitionRef = useRef<Recognition>();
    const onTextRef = useRef(onText);
    onTextRef.current = onText;
    const Recognition = getRecognition();

    useEffect(() => () => recognitionRef.current?.abort(), []);

    const toggle = useCallback(() => {
        if (!Recognition) return;
        if (recognitionRef.current) {
            recognitionRef.current.abort();
            return;
        }
        const recognition = new Recognition();
        recognition.lang = globalize.getCurrentLocale() || navigator.language;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onresult = event => {
            const text = Array.from(event.results).map(result => result[0]?.transcript ?? '').join('');
            onTextRef.current(text);
        };
        const finish = () => {
            recognitionRef.current = undefined;
            setIsListening(false);
        };
        recognition.onend = finish;
        recognition.onerror = finish;
        recognitionRef.current = recognition;
        setIsListening(true);
        try {
            recognition.start();
        } catch {
            // Already running or blocked (e.g. no microphone permission)
            finish();
        }
    }, [ Recognition ]);

    return { isSupported: Boolean(Recognition), isListening, toggle };
};
