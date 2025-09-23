import type { ClockRotation } from '$lib/domain/ClockRotation';
import { NUMBERS_CLOCK_SCHEME } from '$lib/domain/scheme';
import { wonderingManager } from '$lib/infrastructure/workers/wondering-manager.svelte';

export type RenderingType = 'html' | 'svg' | 'svg-use' | 'webgl';

export class ClocksRenderer {
	public board: ClockRotation[][] = $state([]);
	private text: string = '';
	public wondering: boolean = $state(false);
	public renderingType: RenderingType = $state('svg');
	public width: number;
	public height: number;
	private wonderingFrame: number = $state(0);
	private wonderingUnsubscribe: (() => void) | null = null;

	init(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.board = Array.from({ length: width }, () => Array.from({ length: height }, () => ''));

		wonderingManager.initBoard(width, height, 400);
	}

	render(text: string) {
		this.text = text;
		// console.log('rendering', text);
		// Clear the board first
		this.board = Array.from({ length: this.width }, () =>
			Array.from({ length: this.height }, () => '')
		);

		if (this.wondering) {
			return; // In wondering mode, don't render digits
		}

		const symbols = text.split('');
		const boardCenter = {
			x: Math.floor(this.width / 2),
			y: Math.floor(this.height / 2)
		};

		// Calculate total width needed for all symbols
		const digitWidth = 4; // Each digit pattern is 4 cells wide
		const digitHeight = 6; // Each digit pattern is 6 cells tall
		const totalWidth = symbols.length * digitWidth;

		// Calculate starting position to center all digits
		const startX = Math.max(0, Math.floor(boardCenter.x - totalWidth / 2));
		const startY = Math.max(0, Math.floor(boardCenter.y - digitHeight / 2));

		// Place each symbol on the board
		symbols.forEach((symbol, index) => {
			const digit = parseInt(symbol);
			if (isNaN(digit) || !(digit in NUMBERS_CLOCK_SCHEME)) {
				return; // Skip invalid symbols
			}

			const pattern = NUMBERS_CLOCK_SCHEME[digit];
			const digitStartX = startX + index * digitWidth;

			// Place the pattern on the board
			this.placePattern(pattern, digitStartX, startY);
		});
	}

	private placePattern(pattern: ClockRotation[][], startX: number, startY: number) {
		for (let row = 0; row < pattern.length; row++) {
			for (let col = 0; col < pattern[row].length; col++) {
				const boardX = startX + col;
				const boardY = startY + row;

				// Check bounds
				if (boardX >= 0 && boardX < this.width && boardY >= 0 && boardY < this.height) {
					const rotation = pattern[row][col];
					if (rotation !== '') {
						// Only place non-empty rotations
						this.board[boardX][boardY] = rotation;
					}
				}
			}
		}
	}

	startWondering() {
		this.wondering = true;
		// Subscribe to wondering ticks to trigger reactivity
		this.wonderingUnsubscribe?.();
		this.wonderingUnsubscribe = wonderingManager.subscribe(() => {
			this.wonderingFrame++;
		});
		wonderingManager.startWondering();
	}

	stopWondering() {
		this.wondering = false;
		wonderingManager.stopWondering();
		this.wonderingUnsubscribe?.();
		this.wonderingUnsubscribe = null;
		this.render(this.text);
	}

	cellRotation(x: number, y: number) {
		if (!this.board[x]) {
			return '';
		}
		return this.board[x][y];
	}

	cellRawRotation(x: number, y: number): [number, number] | null {
		if (this.wondering) {
			const angle1 = wonderingManager.cellAngle(x, y);
			const angle2 = wonderingManager.cellAngle(x, y) + Math.random() * 180 - 90; // Second angle with some variation
			return [angle1, angle2];
		}
		return null;
	}
}

export const clocksRenderer = new ClocksRenderer();
