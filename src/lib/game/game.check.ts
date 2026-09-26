// Run: pnpm test
import assert from 'node:assert/strict';
import { Has } from './components.ts';
import { Game } from './game.ts';
import { CLASSIC, tear, TRIP, type Mode } from './modes.ts';

const create = (mode: Mode, waiting = false) => {
	const game = new Game(mode, waiting);
	game.now = () => new Date(2026, 0, 1, 12, 34);
	return game;
};
let game = create(CLASSIC);
game.episode.next = Infinity; // glitches only when a step below asks for one
const clocks = () => {
	const found: number[] = [];
	for (let e = 0; e < game.size; e++) if (game.mask[e] & Has.Cell) found.push(e);
	return found;
};
const at = (col: number, row: number) =>
	clocks().find((e) => game.cell.col[e] === col && game.cell.row[e] === row)!;
const angles = (e: number) =>
	[game.hands.angle1[e], game.hands.angle2[e]].map((a) => (Math.round(a) + 360) % 360);

/**
 * Plays `seconds` at 60fps. Fails if any hand ever ticks backwards.
 * Returns the share of moving hands per frame, the slowest any hand turned (deg/s), the furthest any clock
 * strayed from regular size, the fastest any clock changed size (per second), and whether the whole wall
 * ever grew or shrank together.
 */
const play = (seconds: number) => {
	const { angle1, angle2, velocity1, velocity2 } = game.hands;
	const moving: number[] = [];
	let slowest = Infinity;
	let grown = 0;
	let growthRate = 0;
	let inSync = false;
	for (let frame = 0; frame < seconds * 60; frame++) {
		const list = clocks();
		const before = list.map((e) => [angle1[e], angle2[e], game.scale.value[e]]);
		game.update(1 / 60);
		let movingHands = 0;
		let smallest = Infinity;
		let largest = -Infinity;
		list.forEach((e, i) => {
			for (const turn of [angle1[e] - before[i][0], angle2[e] - before[i][1]]) {
				assert.ok((turn + 360) % 360 < 180, `clock ${e} ticked backwards by ${turn}°`);
			}
			movingHands += Number(velocity1[e] > 1) + Number(velocity2[e] > 1);
			slowest = Math.min(slowest, velocity1[e], velocity2[e]);
			grown = Math.max(grown, Math.abs(game.scale.value[e] - 1));
			growthRate = Math.max(growthRate, Math.abs(game.scale.value[e] - before[i][2]) * 60);
			smallest = Math.min(smallest, game.scale.value[e] - 1);
			largest = Math.max(largest, game.scale.value[e] - 1);
		});
		moving.push(movingHands / (list.length * 2));
		inSync ||= smallest > 0.02 || largest < -0.02;
	}
	return { moving, slowest, grown, growthRate, inSync };
};

// 1920x1080 fits 61x34 clocks of 30px with 1px gaps.
game.resize(1920, 1080);
assert.equal(clocks().length, 61 * 34);

// One long frame reveals every clock and settles every hand. "1234" starts at col 22, row 14.
game.update(10);
assert.deepEqual(angles(at(22, 14)), [0, 90]); // "1" top-left corner
assert.deepEqual(angles(at(37, 19)), [270, 180]); // "4" bottom-right corner
assert.deepEqual(angles(at(0, 0)), [135, 135]); // blank

// Shrinking keeps surviving clocks, growing back spawns the missing ones.
const corner = at(0, 0);
game.resize(820, 410);
assert.equal(clocks().length, 26 * 13);
assert.equal(at(0, 0), corner);
game.resize(1920, 1080);
game.update(10);

// Wandering (window out of focus) loops through different patterns without ever pausing the wall.
game.setWandering(true);
const seen = new Set();
const moving = [];
for (let second = 0; second < 13; second++) {
	moving.push(...play(1).moving);
	seen.add(game.episode.pattern);
}
assert.ok(seen.size >= 2 && !seen.has(null), `patterns seen: ${seen.size}`);
assert.ok(
	Math.min(...moving.slice(6)) > 0.9,
	`only ${Math.min(...moving)} of hands moving at once`
);

// Clocks spawned while wandering join the running pattern.
game.resize(820, 410);
game.resize(1920, 1080);
assert.ok(clocks().every((e) => game.mask[e] & Has.Glitch));

// Getting focus back lands every hand on the digits, still clockwise.
game.setWandering(false);
play(3);
assert.deepEqual(angles(at(22, 14)), [0, 90]);
assert.deepEqual(angles(at(37, 19)), [270, 180]);

// Every glitch pattern turns clockwise, keeps clock sizes regular, and hands the wall back to the time.
// Smaller wall keeps this fast.
game.resize(1640, 820);
game.update(10);
for (const pattern of CLASSIC.patterns) {
	game.glitch(pattern);
	assert.equal(play(game.episode.duration + 3).grown, 0);
	assert.equal(game.episode.pattern, null);
	assert.deepEqual(angles(at(18, 10)), [0, 90]); // "1" top-left corner on a 52x26 wall
}

// The director starts a glitch on its own once the wait runs out.
game.episode.next = 0;
game.update(1 / 60);
assert.notEqual(game.episode.pattern, null);
game.update(10);
assert.equal(game.episode.pattern, null);

// Reduced motion: no wandering, no glitches, hands snap.
game.reducedMotion = true;
game.setWandering(true);
assert.equal(game.wandering, false);
game.glitch();
assert.equal(game.episode.pattern, null);
game.text = '';
game.update(0);
assert.deepEqual(angles(at(18, 10)), [0, 90]);

// Trip: plays patterns back to back from the start, without losing focus.
game = create(TRIP);
assert.ok(game.wandering);
game.resize(1640, 820);
game.update(10);
play(2);

// Trip: every pattern, blooming over the one before, keeps every hand of every clock turning.
for (const pattern of TRIP.patterns) {
	game.glitch(pattern);
	const { slowest } = play(game.episode.duration);
	assert.ok(slowest > 12, `a hand slowed down to ${slowest.toFixed(1)}°/s`);
}

// Patterns bloom into each other: by half a run every clock has left the old one and follows the new.
// Unison points every hand the same way, so any clock left behind stands out.
const [unison, , vortex] = TRIP.patterns;
game.glitch(vortex);
play(2);
game.glitch(unison);
play(game.episode.duration * 0.6);
const first = game.hands.target1[clocks()[0]];
for (const e of clocks()) {
	const off = ((((game.hands.target1[e] - first) % 360) + 540) % 360) - 180;
	assert.ok(Math.abs(off) < 0.5, `clock ${e} is ${off.toFixed(1)}° off unison`);
}

// No pattern comes back within the last half of the list played.
const order: unknown[] = [];
for (let i = 0; i < 60; i++) {
	game.episode.elapsed = game.episode.duration;
	game.update(1 / 60);
	order.push(game.episode.pattern);
}
const recent = TRIP.patterns.length / 2;
order.forEach((pattern, i) => {
	assert.ok(!order.slice(Math.max(0, i - recent), i).includes(pattern), `repeat at run ${i}`);
});
game.setWandering(false);

// Trip: every pattern, love ones too, turns clockwise and changes clock sizes, gently: slowly enough
// not to read as pulsing. They settle back with the time. The time shows at least TRIP.timeFor[0]
// seconds, so 2.8s after a pattern ends no new one has started.
for (const pattern of TRIP.patterns) {
	game.glitch(pattern);
	const { grown, growthRate, inSync } = play(game.episode.duration);
	assert.ok(grown > 0.03, `clocks change size (${grown})`);
	assert.ok(growthRate < 0.7, `clocks change size too fast (${growthRate}/s)`);
	assert.ok(!inSync, 'the whole wall grows or shrinks together');
	play(2.8);
	assert.equal(game.episode.pattern, null);
	assert.ok(
		clocks().every((e) => game.scale.value[e] === 1),
		'clocks back to regular size'
	);
}

// Waiting: hands lie flat and still, and nothing starts a pattern, until a tear drops.
game = create(TRIP, true);
game.resize(1640, 820);
game.update(10);
game.glitch();
game.setWandering(true);
assert.equal(game.episode.pattern, null);
assert.ok(
	clocks().every((e) => angles(e).join() === '0,180'),
	'hands lie flat'
);
assert.equal(Math.max(...play(2).moving), 0);

// The tear rings out from where it dropped (the middle of the wall), turning clockwise,
// then trip plays patterns without the time in between.
game.drop(820, 410);
assert.equal(game.episode.pattern, tear);
play(0.5);
assert.ok(game.hands.velocity1[at(26, 13)] > 0, 'the middle ripples');
assert.equal(game.hands.velocity1[at(0, 0)], 0, 'the corner is still calm');
play(game.episode.duration);
assert.ok(TRIP.patterns.includes(game.episode.pattern!), 'trip took over');

// Classic shows the time once the tear is done.
game = create(CLASSIC, true);
game.resize(1640, 820);
game.update(10);
game.drop(0, 0);
play(game.episode.duration + 3);
assert.equal(game.episode.pattern, null);
assert.deepEqual(angles(at(18, 10)), [0, 90]);

// Switching mode keeps the wall: the same clocks and hands, only the colors fade over.
game = create(CLASSIC, true);
game.resize(1640, 820);
game.update(10);
const wall = clocks();
game.setMode(TRIP);
assert.deepEqual(clocks(), wall);
assert.ok(
	clocks().every((e) => !(game.mask[e] & Has.Reveal) && angles(e).join() === '0,180'),
	'clocks stay flat and visible'
);
game.update(0.15);
assert.ok(game.colors > 0 && game.colors < 1, `colors fading in (${game.colors})`);
game.update(0.15);
assert.equal(game.colors, 1);

// After the tear, each mode takes over its show on a switch: classic the time, trip patterns.
game.drop(820, 410);
play(game.episode.duration + 1);
game.setMode(CLASSIC);
assert.equal(game.wandering, false);
play(3);
assert.equal(game.episode.pattern, null);
assert.deepEqual(angles(at(18, 10)), [0, 90]);
assert.ok(
	clocks().every((e) => game.scale.value[e] === 1),
	'clocks back to regular size'
);
game.setMode(TRIP);
assert.ok(game.wandering && TRIP.patterns.includes(game.episode.pattern!), 'trip took over');

// Patterns played in trip don't keep classic from picking one.
for (const pattern of CLASSIC.patterns) game.glitch(pattern);
game.setMode(CLASSIC);
game.glitch();
assert.ok(CLASSIC.patterns.includes(game.episode.pattern!), 'classic picked a pattern');

console.log('game.check.ts: ok');
