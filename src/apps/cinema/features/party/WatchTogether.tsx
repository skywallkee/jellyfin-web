import Close from '@mui/icons-material/Close';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Groups from '@mui/icons-material/Groups';
import Logout from '@mui/icons-material/Logout';
import PlayCircle from '@mui/icons-material/PlayCircle';
import StopCircle from '@mui/icons-material/StopCircle';
import classNames from 'classnames';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCreateSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useCreateSyncPlayGroup';
import { useJoinSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useJoinSyncPlayGroup';
import { useLeaveSyncPlayGroup } from 'apps/modern/features/syncPlay/hooks/api/useLeaveSyncPlayGroup';
import { useSyncPlayGroups } from 'apps/modern/features/syncPlay/hooks/api/useSyncPlayGroups';
import { useSyncPlay } from 'apps/modern/features/syncPlay/hooks/useSyncPlay';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';

import { useOverlay } from '../../hooks/useOverlay';
import { playSound } from '../../utils/sounds';

/** The URL parameter in an invite link: opening the link joins that watch party. */
export const PARTY_PARAM = 'party';

const getInviteLink = (groupId: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}#/home?${PARTY_PARAM}=${encodeURIComponent(groupId)}`;
};

/** Joins the watch party in the address (from an invite link), then tidies the address. */
export const useJoinFromInvite = () => {
    const [ searchParams, setSearchParams ] = useSearchParams();
    const groupId = searchParams.get(PARTY_PARAM);
    const joinGroup = useJoinSyncPlayGroup();
    const handledRef = useRef<string>();

    useEffect(() => {
        if (!groupId || handledRef.current === groupId) return;
        handledRef.current = groupId;
        joinGroup.mutate({ joinGroupRequestDto: { GroupId: groupId } });
        setSearchParams(params => {
            const next = new URLSearchParams(params);
            next.delete(PARTY_PARAM);
            return next;
        }, { replace: true });
    }, [ groupId, joinGroup, setSearchParams ]);
};

/** Small round avatars for the people in the party. */
const People: FC<{ names: string[] }> = ({ names }) => (
    <ul className='cinema-party__people'>
        {names.map(name => (
            <li key={name} className='cinema-party__person'>
                <span className='cinema-avatar cinema-party__avatar'>{name.slice(0, 2).toUpperCase()}</span>
                <span>{name}</span>
            </li>
        ))}
    </ul>
);

const PartyPanel: FC<{ onClose: () => void }> = ({ onClose }) => {
    const { __legacyApiClient__, user } = useApi();
    const { isActive, currentGroup, syncPlay } = useSyncPlay();
    const { data: groups } = useSyncPlayGroups();
    const createGroup = useCreateSyncPlayGroup();
    const joinGroup = useJoinSyncPlayGroup();
    const leaveGroup = useLeaveSyncPlayGroup();
    const [ copied, setCopied ] = useState(false);
    useOverlay(true, onClose);

    const inviteLink = currentGroup?.GroupId ? getInviteLink(currentGroup.GroupId) : undefined;
    const isPlaying = Boolean(syncPlay?.Manager.isPlaybackActive());

    const share = async () => {
        if (!inviteLink) return;
        try {
            if (navigator.share) {
                await navigator.share({ title: globalize.translate('CinemaWatchTogether'), url: inviteLink });
            } else {
                await navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            // Sharing cancelled
        }
    };

    return (
        <div className='cinema-party cinema-glass' role='dialog' aria-label={globalize.translate('CinemaWatchTogether')}>
            <header className='cinema-settings__header'>
                <h2>{globalize.translate('CinemaWatchTogether')}</h2>
                <button type='button' className='cinema-iconbtn cinema-focusable' onClick={onClose} aria-label={globalize.translate('ButtonClose')}>
                    <Close fontSize='small' />
                </button>
            </header>

            {isActive && currentGroup ?
                <>
                    <p className='cinema-party__name'>{currentGroup.GroupName}</p>
                    <span className='cinema-settings__label'>{globalize.translate('CinemaWatchingWithYou')}</span>
                    <People names={currentGroup.Participants ?? []} />

                    <span className='cinema-settings__label'>{globalize.translate('CinemaInvite')}</span>
                    <div className='cinema-party__invite'>
                        <input className='cinema-smart__name' readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} aria-label={globalize.translate('CinemaInviteLink')} />
                        <button type='button' className='cinema-btn cinema-btn--primary cinema-focusable' onClick={share}>
                            <ContentCopy fontSize='small' />
                            {copied ? globalize.translate('CinemaCopied') : globalize.translate('Share')}
                        </button>
                    </div>
                    <p className='cinema-party__help'>{globalize.translate('CinemaPartyHelp')}</p>

                    <div className='cinema-party__actions'>
                        {__legacyApiClient__ && !syncPlay?.Manager.isPlaylistEmpty() && (
                            <button
                                type='button'
                                className='cinema-btn cinema-glass cinema-focusable'
                                onClick={() => (isPlaying ?
                                    syncPlay?.Manager.haltGroupPlayback(__legacyApiClient__) :
                                    syncPlay?.Manager.resumeGroupPlayback(__legacyApiClient__))}
                            >
                                {isPlaying ? <StopCircle /> : <PlayCircle />}
                                {globalize.translate(isPlaying ? 'LabelSyncPlayHaltPlayback' : 'LabelSyncPlayResumePlayback')}
                            </button>
                        )}
                        <button type='button' className='cinema-btn cinema-glass cinema-focusable' onClick={() => leaveGroup.mutate()}>
                            <Logout />
                            {globalize.translate('LabelSyncPlayLeaveGroup')}
                        </button>
                    </div>
                </> :
                <>
                    <p className='cinema-party__help'>{globalize.translate('CinemaPartyIntro')}</p>
                    <button
                        type='button'
                        className='cinema-btn cinema-btn--primary cinema-focusable cinema-party__start'
                        disabled={createGroup.isPending}
                        onClick={() => {
                            playSound('select');
                            createGroup.mutate({ newGroupRequestDto: { GroupName: globalize.translate('SyncPlayGroupDefaultTitle', user?.Name ?? '') } });
                        }}
                    >
                        <Groups />
                        {globalize.translate('CinemaStartParty')}
                    </button>
                    {groups && groups.length > 0 && (
                        <>
                            <span className='cinema-settings__label'>{globalize.translate('CinemaJoinParty')}</span>
                            <ul className='cinema-party__groups'>
                                {groups.map(group => (
                                    <li key={group.GroupId}>
                                        <button
                                            type='button'
                                            className='cinema-settings__link cinema-focusable'
                                            onClick={() => group.GroupId && joinGroup.mutate({ joinGroupRequestDto: { GroupId: group.GroupId } })}
                                        >
                                            <Groups fontSize='small' />
                                            <span>{group.GroupName}</span>
                                            <small>{(group.Participants ?? []).join(', ')}</small>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>}
        </div>
    );
};

/**
 * "Watch together": start a watch party (Jellyfin SyncPlay) or join one, see who's in it, and
 * send an invite link. Playing anything while in a party plays it for everyone, in sync.
 */
const WatchTogether: FC<{ className?: string }> = ({ className }) => {
    const [ isOpen, setIsOpen ] = useState(false);
    const { isActive, currentGroup } = useSyncPlay();
    const count = currentGroup?.Participants?.length ?? 0;

    return (
        <span className='cinema-party-anchor'>
            <button
                type='button'
                className={classNames(className, { 'is-active': isActive })}
                onClick={() => setIsOpen(open => !open)}
                aria-expanded={isOpen}
                aria-label={globalize.translate('CinemaWatchTogether')}
                title={globalize.translate('CinemaWatchTogether')}
            >
                <Groups fontSize='small' />
                {isActive && count > 0 && <span className='cinema-party__count'>{count}</span>}
            </button>
            {isOpen && <PartyPanel onClose={() => setIsOpen(false)} />}
        </span>
    );
};

export default WatchTogether;
