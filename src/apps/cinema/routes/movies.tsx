import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { type FC } from 'react';

import LibraryRoute from '../features/library/LibraryRoute';

const ITEM_TYPES = [ BaseItemKind.Movie ];

const Movies: FC = () => <LibraryRoute itemTypes={ITEM_TYPES} fallbackPage='movies' />;

export default Movies;
