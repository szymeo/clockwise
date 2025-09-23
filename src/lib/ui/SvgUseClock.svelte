<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { ClockRotation } from '../domain/ClockRotation';
	import { CLOCK_FACE_SIZE } from '../domain/consts';
	import { Tween } from 'svelte/motion';

	type Props = {
		x: number;
		y: number;
		rotation: ClockRotation;
		rawRotation: [number, number] | null;
		delay: number;
	};

	const ROTATION_ANGLES: Record<ClockRotation, number[]> = {
		x: [0, 180],
		y: [-90, 90],
		xy: [-90, 0],
		'-xy': [-90, 180],
		'x-y': [0, 90],
		'-x-y': [90, 180],
		'': [135, 135]
	};

	const { x, y, rotation, rawRotation, delay }: Props = $props();

	let rendered = $state(false);

	// Tween animations for smooth transitions
	const duration = 1200;
	const firstAngleTween = $derived(new Tween(0));
	const secondAngleTween = $derived(new Tween(0));

	const updateAngle = (angle: Tween<number>, newAngle: number) => {
		const current = angle.current;
		const norm = (a: number) => ((a % 360) + 360) % 360;

		const from = norm(current);
		const to = norm(newAngle);
		const delta = (to - from + 360) % 360;

		const nextPhase = current + delta;

		angle.set(nextPhase);
	};

	const updateAngles = (newAngles: number[]) => {
		updateAngle(firstAngleTween, newAngles[0]);
		updateAngle(secondAngleTween, newAngles[1]);
	};

	$effect(() => {
		const nextAngles = rawRotation ?? ROTATION_ANGLES[rotation];
		untrack(() => updateAngles(nextAngles));
	});

	onMount(() => {
		const t = setTimeout(() => {
			rendered = true;
		}, delay);

		return () => clearTimeout(t);
	});

	// Get the actual angles to use (either raw angles from wondering mode or animated angles)
	const actualFirstAngle = $derived(firstAngleTween.current);
	const actualSecondAngle = $derived(secondAngleTween.current);
</script>

{#if rendered}
	<!-- Single use element with CSS variables controlling hand rotations -->
	<use
		href="#clock"
		{x}
		{y}
		width={CLOCK_FACE_SIZE}
		height={CLOCK_FACE_SIZE}
		style="--hand1-rotation: {actualFirstAngle}deg; --hand2-rotation: {actualSecondAngle}deg;"
	/>
{/if}
