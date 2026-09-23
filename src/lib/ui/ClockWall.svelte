<!--
	A wall of clocks filling its container. `mode` is read once, remount to switch.
	Keys: `w` toggles wandering (same as the window losing focus), `g` glitches, `d` flips the theme.
-->
<script lang="ts">
	import { Game } from '$lib/game/game';
	import type { Mode } from '$lib/game/modes';
	import { onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { MediaQuery } from 'svelte/reactivity';

	let { mode }: { mode: Mode } = $props();

	let canvas: HTMLCanvasElement;
	const game = new Game(mode);
	const systemDark = new MediaQuery('(prefers-color-scheme: dark)');
	/** Set by the `d` key, otherwise the system theme wins. */
	let darkOverride = $state<boolean>();
	const dark = $derived(darkOverride ?? systemDark.current);

	onMount(() => {
		game.start(canvas);
		if (mode.wanderWhenAway && !document.hasFocus()) game.setWandering(true);

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
		game.reducedMotion = prefersReducedMotion.current;
		if (game.reducedMotion) game.setWandering(false);
	});

	$effect(() => {
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
		game.dark = dark;
		game.dirty = true;
	});

	function onkeydown(event: KeyboardEvent) {
		const key = event.key.toLowerCase();
		// Same as the window losing or getting back focus.
		if (key === 'w') game.setWandering(!game.wandering);
		if (key === 'd') darkOverride = !dark;
		if (key === 'g') game.glitch();
	}
</script>

<svelte:window
	{onkeydown}
	onblur={() => mode.wanderWhenAway && game.setWandering(true)}
	onfocus={() => mode.wanderWhenAway && game.setWandering(false)}
/>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
