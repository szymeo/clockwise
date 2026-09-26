<!--
	A wall of clocks filling its container. Changing `mode` keeps the clocks and fades the colors over.
	`waiting` is read once and keeps the hands flat and still until `drop(x, y)` drops a tear at viewport px x, y.
	Keys: `w` toggles wandering (patterns back to back), `g` glitches, `d` flips the theme.
-->
<script lang="ts">
	import { Game } from '$lib/game/game';
	import type { Mode } from '$lib/game/modes';
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';

	let { mode, waiting = false }: { mode: Mode; waiting?: boolean } = $props();

	let canvas: HTMLCanvasElement;
	const game = new Game(mode, waiting);
	const systemDark = new MediaQuery('(prefers-color-scheme: dark)');
	/** Set by the `d` key, otherwise the system theme wins. */
	let darkOverride = $state<boolean>();
	const dark = $derived(darkOverride ?? systemDark.current);

	onMount(() => {
		game.start(canvas);

		const observer = new ResizeObserver(([entry]) => {
			const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
			const pixels = entry.devicePixelContentBoxSize?.[0];
			game.resize(
				width,
				height,
				pixels?.inlineSize ?? Math.round(width * devicePixelRatio),
				pixels?.blockSize ?? Math.round(height * devicePixelRatio)
			);
		});
		try {
			// Also fires when only the pixel ratio changes, e.g. moving the window to another display.
			observer.observe(canvas, { box: 'device-pixel-content-box' });
		} catch {
			observer.observe(canvas);
		}

		return () => {
			observer.disconnect();
			game.stop();
		};
	});

	$effect(() => {
		game.setMode(mode);
		if (mode.wander === 'away' && !document.hasFocus()) game.setWandering(true);
	});

	$effect(() => {
		game.reducedMotion = prefersReducedMotion.current;
		if (game.reducedMotion) game.setWandering(false);
	});

	$effect(() => {
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		game.dark = dark;
		game.dirty = true;
	});

	export function drop(x: number, y: number) {
		const { left, top } = canvas.getBoundingClientRect();
		game.drop(x - left, y - top);
	}

	function onkeydown(event: KeyboardEvent) {
		const key = event.key.toLowerCase();
		if (key === 'w') game.setWandering(!game.wandering);
		if (key === 'd') darkOverride = !dark;
		if (key === 'g') game.glitch();
	}
</script>

<svelte:window
	{onkeydown}
	onblur={() => mode.wander === 'away' && game.setWandering(true)}
	onfocus={() => mode.wander === 'away' && game.setWandering(false)}
/>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
