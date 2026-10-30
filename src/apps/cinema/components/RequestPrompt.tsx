import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import classNames from 'classnames';
import React, { type FC } from 'react';

import globalize from 'lib/globalize';

import { getRequestLinkProps, getRequestSearchUrl } from '../utils/requestLink';

import { useRequestButton } from './RequestButton';

interface RequestPromptProps {
    /** What was searched for; it's carried over to the request site's search. */
    query: string;
    /** Smaller version for the quick search palette. */
    isCompact?: boolean;
    /** Called when the request link is followed (e.g. to close the palette). */
    onOpen?: () => void;
}

/**
 * Shown when a search finds nothing: "not in the library" and a big button to request it.
 * Falls back to the plain "no results" line when the request button is turned off in config.json.
 */
const RequestPrompt: FC<RequestPromptProps> = ({ query, isCompact, onOpen }) => {
    const config = useRequestButton();
    const term = query.trim();

    if (!config) {
        return <p className={isCompact ? 'cinema-qs__empty' : undefined}>{globalize.translate('SearchResultsEmpty', term)}</p>;
    }

    const label = config.label.trim() || globalize.translate('CinemaRequest');

    return (
        <div className={classNames('cinema-request-prompt', { 'cinema-request-prompt--compact': isCompact })} role='status'>
            <p className='cinema-request-prompt__title'>{globalize.translate('CinemaNotInLibrary', term)}</p>
            <p className='cinema-request-prompt__text'>{globalize.translate('CinemaNotInLibraryHint')}</p>
            <a
                className='cinema-request-prompt__button cinema-focusable'
                href={getRequestSearchUrl(config, term)}
                onClick={onOpen}
                {...getRequestLinkProps(config)}
            >
                <AddCircleOutline aria-hidden='true' />
                {`${label} “${term}”`}
            </a>
        </div>
    );
};

export default RequestPrompt;
