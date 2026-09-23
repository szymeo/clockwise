import { HAND_FREQUENCY, Has } from './components.ts';
import type { Game } from './game.ts';

/**
 * Moves visible hands towards their targets on a critically damped spring: smooth start, no bounce,
 * velocity survives re-targeting. Clock sizes ease towards theirs.
 */
export function sys_spring(game: Game, delta: number) {
	const { angle1, angle2, velocity1, velocity2, target1, target2 } = game.hands;
	const scale = game.scale;
	const decay = Math.exp(-HAND_FREQUENCY * delta);
	// ~1s to settle, so pattern switches glide instead of popping.
	const sizeEase = 1 - Math.exp(-2.5 * delta);
	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & (Has.Hands | Has.Reveal)) !== Has.Hands) continue;

		const moved1 = step(angle1, velocity1, target1, e, delta, decay);
		const moved2 = step(angle2, velocity2, target2, e, delta, decay);
		const growth = scale.target[e] - scale.value[e];
		scale.value[e] =
			Math.abs(growth) < 0.001 ? scale.target[e] : scale.value[e] + growth * sizeEase;
		if (moved1 || moved2 || growth !== 0) game.dirty = true;
	}
}

/** Exact critically damped solution, stable for any delta. */
function step(
	angle: Float32Array,
	velocity: Float32Array,
	target: Float32Array,
	e: number,
	delta: number,
	decay: number
) {
	const offset = angle[e] - target[e];
	if (offset === 0 && velocity[e] === 0) return false;

	const push = (velocity[e] + HAND_FREQUENCY * offset) * delta;
	const nextOffset = (offset + push) * decay;
	const nextVelocity = (velocity[e] - HAND_FREQUENCY * push) * decay;
	const settled = Math.abs(nextOffset) < 0.01 && Math.abs(nextVelocity) < 0.1;
	angle[e] = settled ? target[e] : target[e] + nextOffset;
	velocity[e] = settled ? 0 : nextVelocity;

	// Drop whole turns so wandering for hours keeps float32 precision.
	const turns = Math.floor(angle[e] / 360) * 360;
	angle[e] -= turns;
	target[e] -= turns;
	return true;
}
