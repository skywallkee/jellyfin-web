import ArrowBack from '@mui/icons-material/ArrowBack';
import React, { type FC } from 'react';
import { Link } from 'react-router-dom';

import globalize from 'lib/globalize';

/** The pages reached from "All settings", which get a way back to it. */
export const SETTINGS_SUBPAGES = new Set([
    '/userprofile',
    '/mypreferencesdisplay',
    '/mypreferenceshome',
    '/mypreferencesplayback',
    '/mypreferencessubtitles',
    '/mypreferencescontrols',
    '/quickconnect',
    '/cinemastats'
]);

/** A "← All settings" link shown above each settings page. */
const SettingsBackBar: FC = () => (
    <div className='cinema-backbar'>
        <Link to='/mypreferencesmenu' className='cinema-backbar__link cinema-glass cinema-focusable'>
            <ArrowBack fontSize='small' />
            {globalize.translate('CinemaAllSettings')}
        </Link>
    </div>
);

export default SettingsBackBar;
