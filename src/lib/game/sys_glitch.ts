import { Has, turn_hands } from './components.ts';
import type { Game } from './game.ts';
import type { Pattern } from './modes.ts';

const QUERY = Has.Cell | Has.Hands;

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

/** Seconds the time shows before the next pattern. */
export const next_glitch_in = (game: Game) => between(game.mode.timeFor);

/**
 * Shows the time for a while, turns the wall into a random pattern for a while, and so on.
 * While wandering, patterns follow each other without the time in between.
 */
export function sys_glitch(game: Game, delta: number) {
	const episode = game.episode;
	const pattern = episode.pattern;
	if (!pattern) {
		if ((episode.next -= delta) <= 0) start_glitch(game);
		return;
	}

	const t = (episode.elapsed += delta);
	if (t >= episode.duration) return game.wandering ? start_glitch(game) : end_glitch(game);

	const { target1, target2 } = game.hands;
	const span = game.span();
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & (QUERY | Has.Glitch)) !== (QUERY | Has.Glitch)) continue;

		const [x, y] = offset(game, e);
		const [a1, a2, size] = pattern(x, y, t, span);
		const [b1, b2] = pattern(x, y, t - delta, span);
		target1[e] += forward(a1 - b1);
		target2[e] += forward(a2 - b2);
		if (game.mode.sizes) game.scale.target[e] = size ?? 1;
	}
}

/** Starts the given pattern, or a random one other than the current. */
export function start_glitch(game: Game, pattern = pick(game)) {
	if (game.reducedMotion) return;

	game.episode = { pattern, elapsed: 0, duration: between(game.mode.patternFor), next: 0 };
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & QUERY) === QUERY) join_glitch(game, e);
	}
}

/** Pulls one clock into the running pattern. */
export function join_glitch(game: Game, e: number) {
	const { pattern, elapsed } = game.episode;
	if (!pattern) return;

	game.mask[e] |= Has.Glitch;
	const [x, y] = offset(game, e);
	const [a1, a2] = pattern(x, y, elapsed, game.span());
	turn_hands(game, e, a1, a2);
}

export function end_glitch(game: Game) {
	game.episode = { pattern: null, elapsed: 0, duration: 0, next: next_glitch_in(game) };
	for (let e = 0; e < game.size; e++) {
		game.mask[e] &= ~Has.Glitch;
		game.scale.target[e] = 1;
	}
	game.text = '';
}

const pick = (game: Game): Pattern => {
	const options = game.mode.patterns.filter((pattern) => pattern !== game.episode.pattern);
	return options[Math.floor(Math.random() * options.length)];
};

const offset = (game: Game, e: number) => [
	game.cell.col[e] - (game.cols - 1) / 2,
	game.cell.row[e] - (game.rows - 1) / 2
];

/** A pattern step as a clockwise turn, backward steps become no turn. */
const forward = (turn: number) => {
	const clockwise = ((turn % 360) + 360) % 360;
	return clockwise < 180 ? clockwise : 0;
};
