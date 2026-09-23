import { Has } from './components.ts';
import type { Game } from './game.ts';

/** Shows each clock once its reveal delay runs out. */
export function sys_reveal(game: Game, delta: number) {
	for (let e = 0; e < game.size; e++) {
		if (!(game.mask[e] & Has.Reveal) || (game.reveal.delay[e] -= delta) > 0) continue;

		game.mask[e] &= ~Has.Reveal;
		game.dirty = true;
	}
}
