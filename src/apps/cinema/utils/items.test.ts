import { describe, expect, it } from 'vitest';

import type { ItemDto } from 'types/base/models/item-dto';

import { formatRuntime, getEpisodeLabel, getQualityLabels } from './items';

const TICKS_PER_MINUTE = 600_000_000;

describe('formatRuntime', () => {
    it('formats hours and minutes', () => {
        expect(formatRuntime(134 * TICKS_PER_MINUTE)).toBe('2h 14m');
        expect(formatRuntime(120 * TICKS_PER_MINUTE)).toBe('2h');
        expect(formatRuntime(48 * TICKS_PER_MINUTE)).toBe('48m');
    });

    it('never shows 0m for short clips', () => {
        expect(formatRuntime(8 * 10_000_000)).toBe('1m');
    });

    it('returns nothing without a runtime', () => {
        expect(formatRuntime(null)).toBeUndefined();
        expect(formatRuntime(0)).toBeUndefined();
    });
});

describe('getEpisodeLabel', () => {
    it('labels episodes only', () => {
        expect(getEpisodeLabel({ Type: 'Episode', ParentIndexNumber: 2, IndexNumber: 5 } as ItemDto)).toBe('S2 E5');
        expect(getEpisodeLabel({ Type: 'Movie' } as ItemDto)).toBeUndefined();
    });
});

describe('getQualityLabels', () => {
    it('reads resolution, HDR and surround sound', () => {
        const item = {
            MediaStreams: [
                { Type: 'Video', Width: 3840, Height: 2160, VideoRangeType: 'HDR10' },
                { Type: 'Audio', Channels: 6, IsDefault: true }
            ]
        } as ItemDto;
        expect(getQualityLabels(item)).toEqual([ '4K', 'HDR10', '5.1' ]);
    });

    it('treats vertical 1080p video as HD', () => {
        const item = { MediaStreams: [ { Type: 'Video', Width: 1080, Height: 1920, VideoRange: 'SDR' } ] } as ItemDto;
        expect(getQualityLabels(item)).toEqual([ 'HD' ]);
    });
});
