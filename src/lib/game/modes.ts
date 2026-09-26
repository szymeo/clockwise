import { DIGIT_HEIGHT, DIGIT_WIDTH, glyph, ROTATION_ANGLES } from '../domain/scheme.ts';

/**
 * Hand angles (degrees) and an optional clock size for a clock at cell offset x, y from the pattern center,
 * t seconds into the pattern. `span` is half the shorter wall side, in cells.
 * `r` is random in [0, 1) and fixed for one run, so no two runs look alike.
 * Angles must keep turning clockwise as t grows: backward steps are ignored, and a hand that stops stalls the show.
 */
export type Pattern = (
	x: number,
	y: number,
	t: number,
	span: number,
	r: number
) => [angle1: number, angle2: number, size?: number];

export type Mode = {
	patterns: Pattern[];
	/** Seconds a pattern plays. */
	patternFor: [min: number, max: number];
	/** Seconds the time shows between patterns. */
	timeFor: [min: number, max: number];
	/** Patterns play back to back from the start, or while the window is out of focus. */
	wander: 'always' | 'away';
	/** Hands tinted by angle with a drifting hue, instead of grayscale. */
	colors: boolean;
	/** Patterns may grow and shrink clocks. */
	sizes: boolean;
};

const line = (angle: number): [number, number] => [angle, angle + 180];
const deg = (rad: number) => (rad * 180) / Math.PI;
const TAU = 2 * Math.PI;
/**
 * Sizes change gently: at most ~10%, in slow waves (4-8s periods) travelling across the wall,
 * never the whole wall at once. Anything faster or bigger reads as pulsing.
 */
const swell = (phase: number, amount = 0.08) => 1 + amount * Math.sin(phase);

// Every clock a single line, all turning in unison.
const unison: Pattern = (x, y, t) => [...line(t * 120), swell(x * 0.3 + y * 0.2 - t * 0.8, 0.06)];

// A wave rolling across the wall, any direction.
const wave: Pattern = (x, y, t, _span, r) => {
	const d = x * Math.cos(r * TAU) + y * Math.sin(r * TAU);
	return [...line(d * 20 + t * 120), swell(d * 0.4 - t * 1.2)];
};

// Lines circling the center, twisted into a turning spiral, either way.
const vortex: Pattern = (x, y, t, _span, r) => [
	...line(deg(Math.atan2(y, x)) + 90 + Math.hypot(x, y) * (r < 0.5 ? -8 : 8) + t * 60),
	swell(Math.hypot(x, y) * 0.35 - t)
];

// Rings rippling out from the center.
const ripple: Pattern = (x, y, t) => [
	...line(Math.hypot(x, y) * -25 + t * 150),
	swell(Math.hypot(x, y) * 0.4 - t * 1.4)
];

// A big heart spinning in unison, gently breathing, small clocks tracing its outline and turning away.
const heart: Pattern = (x, y, t, span) => {
	const u = x / (span * 0.7);
	const v = -y / (span * 0.7) + 0.2;
	const k = u * u + v * v - 1;
	if (k * k * k - u * u * v * v * v < 0) return [...line(t * 90 + 45), swell(t * 1.2, 0.04) + 0.06];

	const fu = 6 * u * k * k - 2 * u * v * v * v;
	const fv = 6 * v * k * k - 3 * u * u * v * v;
	return [...line(deg(Math.atan2(-fv, fu)) + 90 + t * 45), 0.8];
};

// Field lines drawn between two lovers, each leaning in turn, turning into the rings around them and back.
const kiss: Pattern = (x, y, t, span, r) => {
	const d = span * 0.55;
	const axis = r * Math.PI;
	const u = x * Math.cos(axis) + y * Math.sin(axis);
	const v = y * Math.cos(axis) - x * Math.sin(axis);
	const r1 = (u - d) ** 2 + v * v + 0.5;
	const r2 = (u + d) ** 2 + v * v + 0.5;
	const eu = (u - d) / r1 - (u + d) / r2;
	const ev = v / r1 - v / r2;
	const lean = (distance: number, phase: number) =>
		0.1 * Math.exp(-distance / 10) * (0.5 + 0.5 * Math.sin(t * 1.2 + phase));
	return [...line(deg(Math.atan2(ev, eu) + axis) + t * 45), 1 + lean(r1, 0) + lean(r2, Math.PI)];
};

// A cheeky number in the middle of a slow swirl, whirling apart and back together.
const sixtyNine: Pattern = (x, y, t) => {
	const col = Math.floor(x + DIGIT_WIDTH);
	const row = Math.floor(y + DIGIT_HEIGHT / 2);
	const char =
		col >= 0 && col < 2 * DIGIT_WIDTH && row >= 0 && row < DIGIT_HEIGHT
			? glyph(col < DIGIT_WIDTH ? 6 : 9, col % DIGIT_WIDTH, row)
			: ' ';
	if (char === ' ') return [...line(deg(Math.atan2(y, x)) + 90 + t * 45), 0.9];

	// A whole turn every 4s, lingering on the number, fastest halfway, never quite still.
	const spin = 360 * (t / 4 - (0.6 / TAU) * Math.sin((TAU * t) / 4));
	const [a1, a2] = ROTATION_ANGLES[char];
	return [a1 + spin, a2 + spin, 1.1];
};

const smoothstep = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

/**
 * A tear dropped on the still wall: rings run out from the center, each turning the hands it passes half a turn,
 * so the wall lies flat again behind them. Clocks swell as a ring passes, less the further out.
 */
export const tear: Pattern = (x, y, t, span) => {
	const r = Math.hypot(x, y);
	let turn = 0;
	let crest = 0;
	for (let ring = 0; ring < 3; ring++) {
		// Cells this ring has run past the clock.
		const past = (t - ring * 0.6) * span * 0.6 - r;
		turn += 180 * smoothstep(past / 3);
		crest += Math.exp(-(((past - 1.5) / 2) ** 2));
	}
	return [...line(turn), 1 + 0.12 * crest * Math.exp(-r / (span * 1.5))];
};

// Radial lines turning together, slow waves rolling outward.
const pulse: Pattern = (x, y, t) => [
	...line(deg(Math.atan2(y, x)) + t * 40),
	swell(Math.hypot(x, y) * 0.5 - t * 1.5)
];

/** Grayscale wall that tells the time, glitches now and then, and wanders while nobody is looking. */
export const CLASSIC: Mode = {
	patterns: [unison, wave, vortex, ripple],
	patternFor: [3, 6],
	timeFor: [60, 180],
	wander: 'away',
	colors: false,
	sizes: false
};

/** Colors, gently breathing clocks and love-struck patterns blooming into each other, nonstop. */
export const TRIP: Mode = {
	patterns: [unison, wave, vortex, ripple, heart, kiss, sixtyNine, pulse],
	patternFor: [6, 10],
	/** Only after `w`: glimpses of the time between patterns. */
	timeFor: [3, 5],
	wander: 'always',
	colors: true,
	sizes: true
};
