import { DIGIT_HEIGHT, DIGIT_WIDTH, glyph, ROTATION_ANGLES } from '../domain/scheme.ts';
import { Has, turn_hands } from './components.ts';
import type { Game } from './game.ts';

const QUERY = Has.Cell | Has.Hands;

/** Turns every clock that is not glitching towards its part of the current HHMM, once per minute. */
export function sys_time(game: Game) {
	const now = game.now();
	const text = [now.getHours(), now.getMinutes()].map((n) => String(n).padStart(2, '0')).join('');
	if (text === game.text) return;

	game.text = text;
	if (game.renderer) game.renderer.canvas.textContent = `${text.slice(0, 2)}:${text.slice(2)}`;

	const startX = Math.max(
		0,
		Math.floor(Math.floor(game.cols / 2) - (text.length * DIGIT_WIDTH) / 2)
	);
	const startY = Math.max(0, Math.floor(Math.floor(game.rows / 2) - DIGIT_HEIGHT / 2));

	for (let e = 0; e < game.size; e++) {
		if ((game.mask[e] & (QUERY | Has.Glitch)) !== QUERY) continue;

		const x = game.cell.col[e] - startX;
		const y = game.cell.row[e] - startY;
		const digit =
			x >= 0 && y >= 0 && y < DIGIT_HEIGHT ? text[Math.floor(x / DIGIT_WIDTH)] : undefined;
		const [angle1, angle2] = ROTATION_ANGLES[digit ? glyph(+digit, x % DIGIT_WIDTH, y) : ' '];
		turn_hands(game, e, angle1, angle2);
	}
}
