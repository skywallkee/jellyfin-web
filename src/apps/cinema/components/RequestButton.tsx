import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import React, { type FC, useEffect, useState } from 'react';

import globalize from 'lib/globalize';
import { getRequestButton } from 'scripts/settings/webSettings';

import { getRequestLinkProps, isWebLink, type RequestButtonConfig } from '../utils/requestLink';

/** The request settings from config.json, or null while loading or when the button is off. */
export const useRequestButton = () => {
    const [ config, setConfig ] = useState<RequestButtonConfig | null>(null);

    useEffect(() => {
        let isCurrent = true;
        void getRequestButton().then((value: RequestButtonConfig) => {
            if (isCurrent) setConfig(value);
        });
        return () => {
            isCurrent = false;
        };
    }, []);

    if (!config?.enabled || !isWebLink(config.url)) return null;
    return config;
};

interface RequestButtonProps {
    /** 'bar' for the top bar (icon, plus text on wide screens), 'rail' for the TV side rail. */
    variant: 'bar' | 'rail';
}

/** Opens the request site (Seerr) where people ask for movies and shows that aren't in the library yet. */
const RequestButton: FC<RequestButtonProps> = ({ variant }) => {
    const config = useRequestButton();
    if (!config) return null;

    const label = config.label.trim() || globalize.translate('CinemaRequest');
    const linkProps = getRequestLinkProps(config);

    if (variant === 'rail') {
        return (
            <a className='cinema-navlink cinema-focusable' href={config.url} aria-label={label} {...linkProps}>
                <AddCircleOutline />
                <span className='cinema-navlink__label'>{label}</span>
            </a>
        );
    }

    return (
        <a
            className='cinema-iconbtn cinema-requestbtn cinema-focusable'
            href={config.url}
            aria-label={label}
            title={globalize.translate('CinemaRequestHint')}
            {...linkProps}
        >
            <AddCircleOutline fontSize='small' />
            <span className='cinema-requestbtn__label'>{label}</span>
        </a>
    );
};

export default RequestButton;
