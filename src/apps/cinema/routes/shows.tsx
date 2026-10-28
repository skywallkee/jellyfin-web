import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import React, { type FC } from 'react';

import LibraryRoute from '../features/library/LibraryRoute';

const ITEM_TYPES = [ BaseItemKind.Series ];

const Shows: FC = () => <LibraryRoute itemTypes={ITEM_TYPES} fallbackPage='shows' />;

export default Shows;
