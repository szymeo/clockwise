import {
	DIGIT_HEIGHT,
	DIGIT_WIDTH,
	NUMBERS_CLOCK_SCHEME,
	ROTATION_ANGLES
} from '../domain/scheme.ts';

/**
 * Hand angles (degrees) and an optional clock size for a clock at cell offset x, y from the wall center,
 * t seconds into the pattern. `span` is half the shorter wall side, in cells.
 * Angles must only turn clockwise as t grows, backward steps are ignored.
 */
export type Pattern = (
	x: number,
	y: number,
	t: number,
	span: number
) => [angle1: number, angle2: number, size?: number];

export type Mode = {
	patterns: Pattern[];
	/** Seconds a pattern plays. */
	patternFor: [min: number, max: number];
	/** Seconds the time shows between patterns. */
	timeFor: [min: number, max: number];
	/** Losing window focus plays patterns back to back. */
	wanderWhenAway: boolean;
	/** Hands tinted by angle with a drifting hue, instead of grayscale. */
	colors: boolean;
	/** Patterns may grow and shrink clocks. */
	sizes: boolean;
};

const line = (angle: number): [number, number] => [angle, angle + 180];
const deg = (rad: number) => (rad * 180) / Math.PI;
/**
 * Sizes change gently: at most ~10%, in slow waves (4-8s periods) travelling across the wall,
 * never the whole wall at once. Anything faster or bigger reads as pulsing.
 */
const swell = (phase: number, amount = 0.08) => 1 + amount * Math.sin(phase);

// Every clock a single line, all turning in unison.
const unison: Pattern = (x, y, t) => [...line(t * 120), swell(x * 0.3 + y * 0.2 - t * 0.8, 0.06)];

// Diagonal wave rolling across the wall.
const wave: Pattern = (x, y, t) => [
	...line((x + y) * 15 + t * 120),
	swell((x + y) * 0.3 - t * 1.2)
];

// Lines circling the center, twisted into a turning spiral.
const vortex: Pattern = (x, y, t) => [
	...line(deg(Math.atan2(y, x)) + 90 + Math.hypot(x, y) * 8 + t * 60),
	swell(Math.hypot(x, y) * 0.35 - t)
];

// Rings rippling out from the center.
const ripple: Pattern = (x, y, t) => [
	...line(Math.hypot(x, y) * -25 + t * 150),
	swell(Math.hypot(x, y) * 0.4 - t * 1.4)
];

// A big heart spinning in unison, gently breathing, small clocks flowing around it.
const heart: Pattern = (x, y, t, span) => {
	const u = x / (span * 0.7);
	const v = -y / (span * 0.7) + 0.2;
	const k = u * u + v * v - 1;
	if (k * k * k - u * u * v * v * v < 0) return [...line(t * 90 + 45), swell(t * 1.2, 0.04) + 0.06];

	const fu = 6 * u * k * k - 2 * u * v * v * v;
	const fv = 6 * v * k * k - 3 * u * u * v * v;
	return [...line(deg(Math.atan2(-fv, fu)) + 90), 0.8];
};

// Field lines drawn between two lovers, each leaning in turn.
const kiss: Pattern = (x, y, t, span) => {
	const d = span * 0.55;
	const r1 = (x - d) ** 2 + y * y + 0.5;
	const r2 = (x + d) ** 2 + y * y + 0.5;
	const ex = (x - d) / r1 - (x + d) / r2;
	const ey = y / r1 - y / r2;
	const lean = (r: number, phase: number) =>
		0.1 * Math.exp(-r / 10) * (0.5 + 0.5 * Math.sin(t * 1.2 + phase));
	return [...line(deg(Math.atan2(ey, ex))), 1 + lean(r1, 0) + lean(r2, Math.PI)];
};

// A cheeky number in the middle of a slow swirl.
const sixtyNine: Pattern = (x, y, t) => {
	const col = Math.floor(x + DIGIT_WIDTH);
	const row = Math.floor(y + DIGIT_HEIGHT / 2);
	const glyph =
		col >= 0 && col < 2 * DIGIT_WIDTH && row >= 0 && row < DIGIT_HEIGHT
			? NUMBERS_CLOCK_SCHEME[col < DIGIT_WIDTH ? 6 : 9][row][col % DIGIT_WIDTH]
			: '';
	return glyph
		? [...ROTATION_ANGLES[glyph], 1.1]
		: [...line(deg(Math.atan2(y, x)) + 90 + t * 45), 0.9];
};

// Radial lines, slow waves rolling outward.
const pulse: Pattern = (x, y, t) => [
	...line(deg(Math.atan2(y, x))),
	swell(Math.hypot(x, y) * 0.5 - t * 1.5)
];

/** Grayscale wall that tells the time, glitches now and then, and wanders while nobody is looking. */
export const CLASSIC: Mode = {
	patterns: [unison, wave, vortex, ripple],
	patternFor: [3, 6],
	timeFor: [60, 180],
	wanderWhenAway: true,
	colors: false,
	sizes: false
};

/** Colors, gently breathing clocks and love-struck patterns on loop, with glimpses of the time in between. */
export const TRIP: Mode = {
	patterns: [unison, wave, vortex, ripple, heart, kiss, sixtyNine, pulse],
	patternFor: [6, 10],
	timeFor: [3, 5],
	wanderWhenAway: false,
	colors: true,
	sizes: true
};
