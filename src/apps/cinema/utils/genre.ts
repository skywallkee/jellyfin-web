/** A stable hue per genre name, so each genre keeps its own colour everywhere it appears. */
export const getGenreHue = (name: string) => {
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
    return hash;
};
