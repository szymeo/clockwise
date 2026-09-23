import type { ClockRotation } from './ClockRotation';

/** Hand angles in degrees, 0 points right and angles grow clockwise. */
export const ROTATION_ANGLES: Record<ClockRotation, [number, number]> = {
	x: [0, 180],
	y: [-90, 90],
	xy: [-90, 0],
	'-xy': [-90, 180],
	'x-y': [0, 90],
	'-x-y': [90, 180],
	'': [135, 135]
};

export const DIGIT_WIDTH = 4;
export const DIGIT_HEIGHT = 6;

export const NUMBERS_CLOCK_SCHEME: Record<number, ClockRotation[][]> = {
	0: [
		['x-y', 'x', 'x', '-x-y'],
		['y', 'x-y', '-x-y', 'y'],
		['y', 'y', 'y', 'y'],
		['y', 'y', 'y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	],
	1: [
		['x-y', 'x', '-x-y', ''],
		['xy', '-x-y', 'y', ''],
		['', 'y', 'y', ''],
		['', 'y', 'y', ''],
		['x-y', '-xy', 'xy', '-x-y'],
		['xy', 'x', 'x', '-xy']
	],
	2: [
		['x-y', 'x', 'x', '-x-y'],
		['xy', 'x', '-x-y', 'y'],
		['x-y', 'x', '-xy', 'y'],
		['y', 'x-y', 'x', '-xy'],
		['y', 'xy', 'x', '-x-y'],
		['xy', 'x', 'x', '-xy']
	],
	3: [
		['x-y', 'x', 'x', '-x-y'],
		['xy', 'x', '-x-y', 'y'],
		['x-y', 'x', '-xy', 'y'],
		['xy', 'x', '-x-y', 'y'],
		['x-y', 'x', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	],
	4: [
		['x-y', '-x-y', 'x-y', '-x-y'],
		['y', 'y', 'y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['xy', 'x', '-x-y', 'y'],
		['', '', 'y', 'y'],
		['', '', 'xy', '-xy']
	],
	5: [
		['x-y', 'x', 'x', '-x-y'],
		['y', 'x-y', 'x', '-xy'],
		['y', 'xy', 'x', '-x-y'],
		['xy', 'x', '-x-y', 'y'],
		['x-y', 'x', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	],
	6: [
		['x-y', 'x', 'x', '-x-y'],
		['y', 'x-y', 'x', '-xy'],
		['y', 'xy', 'x', '-x-y'],
		['y', 'x-y', '-x-y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	],
	7: [
		['x-y', 'x', 'x', '-x-y'],
		['xy', 'x', '-x-y', 'y'],
		['', '', 'y', 'y'],
		['', '', 'y', 'y'],
		['', '', 'y', 'y'],
		['', '', 'xy', '-xy']
	],
	8: [
		['x-y', 'x', 'x', '-x-y'],
		['y', 'x-y', '-x-y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['y', 'x-y', '-x-y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	],
	9: [
		['x-y', 'x', 'x', '-x-y'],
		['y', 'x-y', '-x-y', 'y'],
		['y', 'xy', '-xy', 'y'],
		['xy', 'x', '-x-y', 'y'],
		['x-y', 'x', '-xy', 'y'],
		['xy', 'x', 'x', '-xy']
	]
};
