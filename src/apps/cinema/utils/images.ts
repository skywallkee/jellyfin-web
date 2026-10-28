import type { Api } from '@jellyfin/sdk/lib/api';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { getImageApi } from '@jellyfin/sdk/lib/utils/api/image-api';

import type { ItemDto } from 'types/base/models/item-dto';

interface ImageRef {
    itemId: string;
    tag: string;
    type: ImageType;
}

const toRef = (itemId: string | null | undefined, tag: string | null | undefined, type: ImageType): ImageRef | undefined => (
    itemId && tag ? { itemId, tag, type } : undefined
);

const buildUrl = (api: Api, ref: ImageRef | undefined, maxWidth: number) => {
    if (!ref) return undefined;
    return getImageApi(api).getItemImageUrlById(ref.itemId, ref.type, {
        tag: ref.tag,
        maxWidth,
        quality: 90
    });
};

/** Primary images wider than this are treated as landscape (e.g. a frame grabbed from a home video). */
const WIDE_ASPECT_RATIO = 1.2;

export const hasWidePrimary = (item: ItemDto) => (item.PrimaryImageAspectRatio ?? 0) > WIDE_ASPECT_RATIO;

const getWidePrimaryRef = (item: ItemDto) => (
    hasWidePrimary(item) ? toRef(item.Id, item.ImageTags?.Primary, ImageType.Primary) : undefined
);

/** The item's own backdrop, or its parent's (e.g. the series for an episode). */
const getBackdropRef = (item: ItemDto) => (
    toRef(item.Id, item.BackdropImageTags?.[0], ImageType.Backdrop)
    ?? toRef(item.ParentBackdropItemId, item.ParentBackdropImageTags?.[0], ImageType.Backdrop)
);

/** The item's own logo, or its parent's. */
const getLogoRef = (item: ItemDto) => (
    toRef(item.Id, item.ImageTags?.Logo, ImageType.Logo)
    ?? toRef(item.ParentLogoItemId, item.ParentLogoImageTag, ImageType.Logo)
);

/** A 16:9 image: thumb, the episode's own still, a parent thumb, then any backdrop. */
const getLandscapeRef = (item: ItemDto) => (
    toRef(item.Id, item.ImageTags?.Thumb, ImageType.Thumb)
    ?? (item.Type === 'Episode' ? toRef(item.Id, item.ImageTags?.Primary, ImageType.Primary) : undefined)
    ?? toRef(item.ParentThumbItemId, item.ParentThumbImageTag, ImageType.Thumb)
    ?? toRef(item.SeriesId, item.SeriesThumbImageTag, ImageType.Thumb)
    ?? getBackdropRef(item)
    ?? getWidePrimaryRef(item)
);

/** A 2:3 poster. Episodes use their series poster. */
const getPosterRef = (item: ItemDto) => (
    (item.Type === 'Episode' ? toRef(item.SeriesId, item.SeriesPrimaryImageTag, ImageType.Primary) : undefined)
    ?? toRef(item.Id, item.ImageTags?.Primary, ImageType.Primary)
);

/** Full-screen artwork: a backdrop, or a wide primary image when there's no backdrop. */
export const getBackdropUrl = (api: Api, item: ItemDto, maxWidth = 1920) =>
    buildUrl(api, getBackdropRef(item) ?? getWidePrimaryRef(item), maxWidth);

export const hasBackdrop = (item: ItemDto) => Boolean(getBackdropRef(item) ?? getWidePrimaryRef(item));

export const getLogoUrl = (api: Api, item: ItemDto, maxWidth = 800) =>
    buildUrl(api, getLogoRef(item), maxWidth);

export const getLandscapeUrl = (api: Api, item: ItemDto, maxWidth = 640) =>
    buildUrl(api, getLandscapeRef(item), maxWidth);

export const getPosterUrl = (api: Api, item: ItemDto, maxWidth = 400) =>
    buildUrl(api, getPosterRef(item), maxWidth);
