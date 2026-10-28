import classNames from 'classnames';
import React, { type FC, useLayoutEffect, useRef, useState } from 'react';

import globalize from 'lib/globalize';

/** The description, cut to a few lines with "Show more" when it's long. */
const Overview: FC<{ text: string; className?: string }> = ({ text, className }) => {
    const ref = useRef<HTMLParagraphElement>(null);
    const [ isExpanded, setIsExpanded ] = useState(false);
    const [ isClamped, setIsClamped ] = useState(false);

    useLayoutEffect(() => {
        const element = ref.current;
        if (element && !isExpanded) setIsClamped(element.scrollHeight > element.clientHeight + 2);
    }, [ isExpanded, text ]);

    return (
        <div className='cinema-details__overview-wrap'>
            <p ref={ref} className={classNames('cinema-details__overview', className, { 'is-expanded': isExpanded })}>{text}</p>
            {(isClamped || isExpanded) && (
                <button
                    type='button'
                    className='cinema-textbtn cinema-focusable'
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded(expanded => !expanded)}
                >
                    {globalize.translate(isExpanded ? 'ShowLess' : 'ShowMore')}
                </button>
            )}
        </div>
    );
};

export default Overview;
