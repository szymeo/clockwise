import type { Entity, Game } from './game.ts';

// ponytail: fixed capacity, enough for a ~10000x5600 CSS px wall. Grow the stores on demand if a bigger wall is ever needed.
export const MAX_ENTITIES = 1 << 16;

export const Has = {
	Cell: 1 << 0,
	Hands: 1 << 1,
	Reveal: 1 << 2,
	Glitch: 1 << 3
} as const;

export function com_cell(game: Game, entity: Entity, col: number, row: number) {
	game.mask[entity] |= Has.Cell;
	game.cell.col[entity] = col;
	game.cell.row[entity] = row;
}

/** Natural frequency (1/s) of the critically damped spring driving every hand. ~90% of a turn is done after 4 / HAND_FREQUENCY s. */
export const HAND_FREQUENCY = 5;

export function com_hands(game: Game, entity: Entity) {
	game.mask[entity] |= Has.Hands;
	const hands = game.hands;
	hands.angle1[entity] = hands.velocity1[entity] = hands.target1[entity] = 0;
	// Hands start as a flat line, a still wall.
	hands.angle2[entity] = hands.target2[entity] = 180;
	hands.velocity2[entity] = 0;
	game.scale.value[entity] = game.scale.target[entity] = 1;
}

export function com_reveal(game: Game, entity: Entity, delay: number) {
	game.mask[entity] |= Has.Reveal;
	game.reveal.delay[entity] = delay;
}

/** Points both hands at new angles (degrees), always turning clockwise. */
export function turn_hands(game: Game, entity: Entity, angle1: number, angle2: number) {
	const {
		angle1: a1,
		angle2: a2,
		velocity1: v1,
		velocity2: v2,
		target1: t1,
		target2: t2
	} = game.hands;
	t1[entity] = ahead(a1[entity], v1[entity], angle1);
	t2[entity] = ahead(a2[entity], v2[entity], angle2);
	if (game.reducedMotion) {
		a1[entity] = t1[entity];
		a2[entity] = t2[entity];
		v1[entity] = v2[entity] = 0;
	}
}

/**
 * First `target` (mod 360) clockwise of where a hand spinning at `velocity` would coast to rest.
 * Targets at least that far ahead never make the spring overshoot, so hands never tick backwards.
 */
function ahead(angle: number, velocity: number, target: number) {
	const rest = angle + Math.max(0, velocity) / HAND_FREQUENCY;
	return rest + ((((target - rest) % 360) + 360) % 360);
}
