/** Hand angles in degrees per font glyph, 0 points right and angles grow clockwise. */
export const ROTATION_ANGLES: Record<string, [number, number]> = {
	'─': [0, 180],
	'│': [-90, 90],
	'└': [-90, 0],
	'┘': [-90, 180],
	'┌': [0, 90],
	'┐': [90, 180],
	' ': [135, 135]
};

export const DIGIT_WIDTH = 4;
export const DIGIT_HEIGHT = 6;

/** Digits 0-9 side by side, one clock per character. */
const DIGITS = [
	'┌──┐┌─┐ ┌──┐┌──┐┌┐┌┐┌──┐┌──┐┌──┐┌──┐┌──┐',
	'│┌┐│└┐│ └─┐│└─┐││││││┌─┘│┌─┘└─┐││┌┐││┌┐│',
	'││││ ││ ┌─┘│┌─┘││└┘││└─┐│└─┐  │││└┘││└┘│',
	'││││ ││ │┌─┘└─┐│└─┐│└─┐││┌┐│  │││┌┐│└─┐│',
	'│└┘│┌┘└┐│└─┐┌─┘│  ││┌─┘││└┘│  │││└┘│┌─┘│',
	'└──┘└──┘└──┘└──┘  └┘└──┘└──┘  └┘└──┘└──┘'
];

/** Glyph of `digit` at column x, row y. */
export const glyph = (digit: number, x: number, y: number) => DIGITS[y][digit * DIGIT_WIDTH + x];
