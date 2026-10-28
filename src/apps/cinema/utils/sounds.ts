import { areSoundsEnabled, getCinemaSettings } from './settings';

type SoundName = 'move' | 'select' | 'back';

/** Pitch, length and loudness of each short synthesized tick. */
const SOUNDS: Record<SoundName, { frequency: number; endFrequency: number; duration: number; volume: number }> = {
    move: { frequency: 1250, endFrequency: 1050, duration: 0.045, volume: 0.035 },
    select: { frequency: 660, endFrequency: 990, duration: 0.09, volume: 0.06 },
    back: { frequency: 740, endFrequency: 440, duration: 0.09, volume: 0.05 }
};

let context: AudioContext | undefined;

const getContext = () => {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return undefined;
    // Checked for just above; older browsers simply stay silent
    // eslint-disable-next-line compat/compat
    context ??= new AudioContext();
    // Browsers start audio suspended until the user interacts; a key press counts
    if (context.state === 'suspended') context.resume().catch(() => { /* still blocked */ });
    return context;
};

/** Plays a soft interface tick (no audio files needed), when interface sounds are on. */
export const playSound = (name: SoundName) => {
    if (!areSoundsEnabled(getCinemaSettings())) return;
    const audio = getContext();
    if (!audio) return;
    const { frequency, endFrequency, duration, volume } = SOUNDS[name];
    const now = audio.currentTime;

    const oscillator = audio.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
};
