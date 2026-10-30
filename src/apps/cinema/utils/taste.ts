import type { ItemDto } from 'types/base/models/item-dto';

/** Leaves out titles the user gave a thumbs down, so they're never suggested again. */
export const withoutDisliked = (items: ItemDto[]) => items.filter(item => item.UserData?.Likes !== false);
