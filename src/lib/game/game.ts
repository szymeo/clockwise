import { CLOCK_FACE_SIZE, CLOCK_GAP, CLOCK_PITCH } from '../domain/consts.ts';
import { com_cell, com_hands, com_reveal, Has, MAX_ENTITIES } from './components.ts';
import { createRenderer, sys_draw, type Renderer } from './sys_draw.ts';
import { tear, type Mode, type Pattern } from './modes.ts';
import {
	end_glitch,
	join_glitch,
	make_episode,
	start_glitch,
	sys_glitch,
	type Episode
} from './sys_glitch.ts';
import { sys_reveal } from './sys_reveal.ts';
import { sys_spring } from './sys_spring.ts';
import { sys_time } from './sys_time.ts';

export type Entity = number;

/** Seconds the tear plays before the mode takes over. */
const TEAR_FOR = 3.5;

/** Seconds between neighbouring clocks appearing, so the wall fades in as a diagonal wave. */
const REVEAL_STEP = 0.02;

/** Seconds colors take to fade in or out when the mode changes. */
const COLOR_FADE = 0.3;

export class Game {
	mask = new Uint32Array(MAX_ENTITIES);
	/** Upper bound of used entity ids, systems loop up to it. */
	size = 0;

	cell = { col: new Uint16Array(MAX_ENTITIES), row: new Uint16Array(MAX_ENTITIES) };
	hands = {
		angle1: new Float32Array(MAX_ENTITIES),
		angle2: new Float32Array(MAX_ENTITIES),
		velocity1: new Float32Array(MAX_ENTITIES),
		velocity2: new Float32Array(MAX_ENTITIES),
		target1: new Float32Array(MAX_ENTITIES),
		target2: new Float32Array(MAX_ENTITIES)
	};
	reveal = { delay: new Float32Array(MAX_ENTITIES) };
	/** Clock size, 1 is regular. Eases towards target. */
	scale = { value: new Float32Array(MAX_ENTITIES), target: new Float32Array(MAX_ENTITIES) };

	width = 0;
	height = 0;
	pixelWidth = 0;
	pixelHeight = 0;
	cols = 0;
	rows = 0;
	originX = 0;
	originY = 0;

	/** HHMM currently shown, cleared to force every clock to re-target. */
	text = '';
	wandering = false;
	episode: Episode;
	/** Patterns played lately, newest first. The next one is none of them. */
	played: Pattern[] = [];
	/** Hands lie flat and still, showing neither the time nor patterns, until a tear drops. */
	waiting: boolean;
	/** Hands snap instead of turning, and wandering is off. */
	reducedMotion = false;
	dark = false;
	/** 0 grayscale to 1 colored, fades towards the mode's. */
	colors: number;
	dirty = true;
	/** Seconds since start, drives the color drift. */
	seconds = 0;
	now = () => new Date();
	renderer: Renderer | null = null;
	private frame = 0;

	mode: Mode;

	constructor(mode: Mode, waiting = false) {
		this.mode = mode;
		this.waiting = waiting;
		this.colors = mode.colors ? 1 : 0;
		this.episode = make_episode(this, null);
		if (mode.wander === 'always') this.setWandering(true);
	}

	start(canvas: HTMLCanvasElement) {
		this.renderer = createRenderer(canvas);
		canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
		canvas.addEventListener('webglcontextrestored', () => {
			this.renderer = createRenderer(canvas);
			this.dirty = true;
		});

		let last = performance.now();
		const tick = (time: number) => {
			// Capped so a tab coming back from the background resumes instead of jumping ahead.
			this.update(Math.min(0.1, Math.max(0, time - last) / 1000));
			last = time;
			this.frame = requestAnimationFrame(tick);
		};
		this.frame = requestAnimationFrame(tick);
	}

	stop() {
		cancelAnimationFrame(this.frame);
	}

	update(delta: number) {
		this.seconds += delta;
		const colors = this.mode.colors ? 1 : 0;
		if (this.colors !== colors) {
			const step = this.reducedMotion ? 1 : delta / COLOR_FADE;
			this.colors = colors ? Math.min(1, this.colors + step) : Math.max(0, this.colors - step);
			this.dirty = true;
		}
		if (!this.waiting) {
			sys_glitch(this, delta);
			sys_time(this);
		}
		sys_reveal(this, delta);
		sys_spring(this, delta);
		sys_draw(this);
	}

	resize(width: number, height: number, pixelWidth = width, pixelHeight = height) {
		this.width = width;
		this.height = height;
		this.pixelWidth = pixelWidth;
		this.pixelHeight = pixelHeight;
		this.cols = Math.floor((width + CLOCK_GAP) / CLOCK_PITCH);
		this.rows = Math.floor((height + CLOCK_GAP) / CLOCK_PITCH);
		this.originX = Math.floor((width - this.cols * CLOCK_PITCH + CLOCK_GAP) / 2);
		this.originY = Math.floor((height - this.rows * CLOCK_PITCH + CLOCK_GAP) / 2);
		this.layout();
		this.text = '';
		this.dirty = true;
	}

	/** Switches mode in place: the clocks stay, colors fade over, and the new mode takes over the show. */
	setMode(mode: Mode) {
		if (mode === this.mode) return;
		this.mode = mode;
		// Recent patterns may all be in the new mode too, leaving none to pick.
		this.played = [];
		this.setWandering(mode.wander === 'always');
	}

	/** Plays patterns back to back instead of showing the time. */
	setWandering(wandering: boolean) {
		if (this.waiting) return;
		this.wandering = wandering && !this.reducedMotion;
		if (this.wandering) start_glitch(this);
		else if (this.episode.pattern) end_glitch(this);
	}

	/** Half the shorter wall side, in cells. */
	span() {
		return Math.min(this.cols, this.rows) / 2;
	}

	/** Starts a glitch right away, random pattern unless given. */
	glitch(pattern?: Pattern) {
		if (!this.waiting) start_glitch(this, pattern);
	}

	/** Ends the wait: a tear drops at x, y (CSS px from the wall's top left), then the wall plays its mode. */
	drop(x: number, y: number) {
		if (!this.waiting) return;
		this.waiting = false;
		this.wandering = this.mode.wander === 'always' && !this.reducedMotion;
		const cell = (px: number, origin: number, count: number) =>
			(px - origin - CLOCK_FACE_SIZE / 2) / CLOCK_PITCH - (count - 1) / 2;
		start_glitch(this, tear, {
			center: [cell(x, this.originX, this.cols), cell(y, this.originY, this.rows)],
			duration: TEAR_FOR,
			tempo: null
		});
	}

	/** Keeps exactly one clock per grid cell: drops clocks that fell off, spawns missing ones. */
	private layout() {
		const taken = new Uint8Array(this.cols * this.rows);
		for (let e = 0; e < this.size; e++) {
			if (!(this.mask[e] & Has.Cell)) continue;
			const col = this.cell.col[e];
			const row = this.cell.row[e];
			if (col < this.cols && row < this.rows) taken[row * this.cols + col] = 1;
			else this.mask[e] = 0;
		}

		let e = 0;
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				if (taken[row * this.cols + col]) continue;
				while (this.mask[e]) e++;
				if (e >= MAX_ENTITIES) throw new Error('No more entities available.');

				com_cell(this, e, col, row);
				com_hands(this, e);
				com_reveal(this, e, (col + row) * REVEAL_STEP);
				join_glitch(this, e);
				this.size = Math.max(this.size, e + 1);
			}
		}
	}
}
