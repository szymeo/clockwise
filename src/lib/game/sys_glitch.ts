import { Has, turn_hands } from './components.ts';
import type { Game } from './game.ts';
import type { Pattern } from './modes.ts';

const QUERY = Has.Cell | Has.Hands;
const TAU = 2 * Math.PI;
/** Seconds a pattern takes to bloom out from its center over the one before. */
const BLOOM = 3;

export type Episode = {
	/** Running pattern, null while the time shows. */
	pattern: Pattern | null;
	elapsed: number;
	duration: number;
	/** Seconds the time still shows before the next pattern. */
	next: number;
	/** Picked at random per run, so no two runs look alike: pattern variant, center (cells off the wall center), tempo phases. */
	r: number;
	center: [number, number];
	/** Null plays the pattern in real time. */
	tempo: [number, number] | null;
	/** The pattern before, still playing where this one has not bloomed yet. */
	from: Episode | null;
};

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);

/** A run of `pattern`, or of the time when null. */
export function make_episode(
	game: Game,
	pattern: Pattern | null,
	from: Episode | null = null
): Episode {
	const span = game.span();
	return {
		pattern,
		elapsed: 0,
		duration: pattern ? between(game.mode.patternFor) : 0,
		next: pattern ? 0 : between(game.mode.timeFor),
		r: Math.random(),
		center: [off_center(game.cols, span), off_center(game.rows, span)],
		tempo: [Math.random() * TAU, Math.random() * TAU],
		from
	};
}

/** Anywhere along the longer wall side, a little off along the shorter one. */
const off_center = (side: number, span: number) =>
	(Math.random() * 2 - 1) * (side / 2 - span * 0.85);

/**
 * Shows the time for a while, turns the wall into a random pattern for a while, and so on.
 * While wandering, patterns bloom into each other without the time in between.
 */
export function sys_glitch(game: Game, delta: number) {
	const episode = game.episode;
	if (!episode.pattern) {
		if ((episode.next -= delta) <= 0) start_glitch(game);
		return;
	}

	const before = episode.elapsed;
	const t = (episode.elapsed += delta);
	if (t >= episode.duration) return game.wandering ? start_glitch(game) : end_glitch(game);

	// Every clock has joined once the bloom is done.
	if (episode.from && before > bloom_time(episode)) episode.from = null;
	const { from } = episode;
	const span = game.span();
	const step = frame(episode, t, delta);
	const fromStep = from && frame(from, from.elapsed + t, delta);
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & (QUERY | Has.Glitch)) !== (QUERY | Has.Glitch)) continue;

		const bloom = from ? bloom_at(game, e) : 0;
		if (fromStep && t <= bloom) follow(game, e, fromStep, span);
		else if (from && before <= bloom) join_glitch(game, e);
		else follow(game, e, step, span);
	}
}

/**
 * Starts the given pattern, or a random one not played lately, with `run` overriding its random picks.
 * It blooms out over a running pattern, or breaks out of the time at once.
 */
export function start_glitch(game: Game, pattern = pick(game), run: Partial<Episode> = {}) {
	if (game.reducedMotion) return;

	const from = game.episode.pattern ? { ...game.episode, from: null } : null;
	game.episode = { ...make_episode(game, pattern, from), ...run };
	game.played = [pattern, ...game.played].slice(0, Math.floor(game.mode.patterns.length / 2));
	if (from) return;
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & QUERY) === QUERY) join_glitch(game, e);
	}
}

/** Pulls one clock into the running pattern. */
export function join_glitch(game: Game, e: number) {
	const episode = game.episode;
	if (!episode.pattern) return;

	game.mask[e] |= Has.Glitch;
	const [x, y] = offset(game, e, episode);
	const [a1, a2] = sample(episode, x, y, episode.elapsed, game.span());
	turn_hands(game, e, a1, a2);
}

export function end_glitch(game: Game) {
	game.episode = make_episode(game, null);
	for (let e = 0; e < game.size; e++) {
		game.mask[e] &= ~Has.Glitch;
		game.scale.target[e] = 1;
	}
	game.text = '';
}

type Step = { episode: Episode; before: number; after: number };

/** Pattern times at the start and end of a frame that ends t seconds into a run. */
const frame = (episode: Episode, t: number, delta: number): Step => ({
	episode,
	before: warp(t - delta, episode.tempo),
	after: warp(t, episode.tempo)
});

/** Moves a clock's targets along a pattern through one frame. */
function follow(game: Game, e: number, { episode, before, after }: Step, span: number) {
	const pattern = episode.pattern!;
	const [x, y] = offset(game, e, episode);
	const [a1, a2, size] = pattern(x, y, after, span, episode.r);
	const [b1, b2] = pattern(x, y, before, span, episode.r);
	game.hands.target1[e] += forward(a1 - b1);
	game.hands.target2[e] += forward(a2 - b2);
	if (game.mode.sizes) game.scale.target[e] = size ?? 1;
}

/** Seconds a run takes to bloom out over the one before. Done by half the run, so the next one always blooms over this one alone. */
const bloom_time = (episode: Episode) => Math.min(BLOOM, episode.duration / 2);

/** Seconds into the run until it blooms out to clock e, the farthest corner last. */
function bloom_at(game: Game, e: number) {
	const episode = game.episode;
	const [cx, cy] = episode.center;
	const [x, y] = offset(game, e, episode);
	const farthest = Math.hypot(game.cols / 2 + Math.abs(cx), game.rows / 2 + Math.abs(cy));
	return (bloom_time(episode) * Math.hypot(x, y)) / farthest;
}

/** The pattern t seconds into its run. */
const sample = (episode: Episode, x: number, y: number, t: number, span: number) =>
	episode.pattern!(x, y, warp(t, episode.tempo), span, episode.r);

/**
 * Pattern time t seconds into a run: the tempo swells between 0.5x and 1.5x
 * in two waves that never line up the same way twice.
 */
const warp = (t: number, tempo: [number, number] | null) => {
	if (!tempo) return t;
	const [p, q] = tempo;
	return (
		t +
		(0.3 / 0.7) * (Math.sin(0.7 * t + p) - Math.sin(p)) +
		(0.2 / 1.19) * (Math.sin(1.19 * t + q) - Math.sin(q))
	);
};

/** A random pattern, none of the last few played. */
const pick = (game: Game): Pattern => {
	const options = game.mode.patterns.filter((pattern) => !game.played.includes(pattern));
	return options[Math.floor(Math.random() * options.length)];
};

/** Clock e's offset from a pattern's center, in cells. */
const offset = (game: Game, e: number, { center }: Episode) => [
	game.cell.col[e] - (game.cols - 1) / 2 - center[0],
	game.cell.row[e] - (game.rows - 1) / 2 - center[1]
];

/** A pattern step as a clockwise turn, backward steps become no turn. */
const forward = (turn: number) => {
	const clockwise = ((turn % 360) + 360) % 360;
	return clockwise < 180 ? clockwise : 0;
};
