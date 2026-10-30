import Casino from '@mui/icons-material/Casino';
import Close from '@mui/icons-material/Close';
import VideoLibraryOutlined from '@mui/icons-material/VideoLibraryOutlined';
import classNames from 'classnames';
import React, { type FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import globalize from 'lib/globalize';

import { SURPRISE_EVENT } from './SurpriseMe';

export interface MenuLink {
    key: string;
    label: string;
    to: string;
    icon: React.ReactNode;
    isActive: boolean;
}

interface MobileLibraryMenuProps {
    links: MenuLink[];
    /** The bar slid away on scroll, so the menu closes with it. */
    isBarHidden: boolean;
    /** Starts loading a link's page as it's about to be opened. */
    onPrefetch?: (key: string) => void;
}

/**
 * Phone tab bar: one main button in place of My List, the libraries and Surprise me.
 * Tapping it slides them up above the bar, each with its name. Tapping it again, anywhere else,
 * pressing Escape or picking one closes it.
 */
const MobileLibraryMenu: FC<MobileLibraryMenuProps> = ({ links, isBarHidden, onPrefetch }) => {
    const [ isOpen, setIsOpen ] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const location = useLocation();
    const label = globalize.translate('HeaderLibraries');
    const hasActive = links.some(link => link.isActive);

    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(open => !open), []);
    const surprise = useCallback(() => {
        setIsOpen(false);
        window.dispatchEvent(new Event(SURPRISE_EVENT));
    }, []);

    // Leaving the page or the bar tucking away closes it
    useEffect(close, [ close, location.pathname, location.search ]);
    useEffect(() => {
        if (isBarHidden) close();
    }, [ close, isBarHidden ]);

    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            close();
            rootRef.current?.querySelector<HTMLElement>('.cinema-libmenu__toggle')?.focus();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [ close, isOpen ]);

    if (!links.length) return null;

    return (
        <div ref={rootRef} className={classNames('cinema-libmenu', { 'is-open': isOpen })}>
            <ul id={menuId} className='cinema-libmenu__list' aria-label={label}>
                {/* The bottom one rises first, the rest follow upwards */}
                {links.map((link, index) => (
                    <li key={link.key} style={{ '--cinema-i': links.length - index } as React.CSSProperties}>
                        <Link
                            to={link.to}
                            className={classNames('cinema-libmenu__item cinema-focusable', { 'is-active': link.isActive })}
                            aria-current={link.isActive ? 'page' : undefined}
                            onPointerEnter={onPrefetch ? () => onPrefetch(link.key) : undefined}
                            onFocus={onPrefetch ? () => onPrefetch(link.key) : undefined}
                            onClick={close}
                        >
                            <span className='cinema-libmenu__icon' aria-hidden='true'>{link.icon}</span>
                            {link.label}
                        </Link>
                    </li>
                ))}
                <li style={{ '--cinema-i': 0 } as React.CSSProperties}>
                    <button type='button' className='cinema-libmenu__item cinema-focusable' onClick={surprise}>
                        <span className='cinema-libmenu__icon' aria-hidden='true'><Casino className='cinema-dice' /></span>
                        {globalize.translate('CinemaSurpriseMe')}
                    </button>
                </li>
            </ul>
            <button
                type='button'
                className={classNames('cinema-iconbtn cinema-libmenu__toggle cinema-focusable', { 'is-active': hasActive })}
                aria-label={label}
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={toggle}
            >
                <VideoLibraryOutlined className='cinema-libmenu__glyph' />
                <Close className='cinema-libmenu__glyph cinema-libmenu__glyph--close' />
            </button>
        </div>
    );
};

export default MobileLibraryMenu;
