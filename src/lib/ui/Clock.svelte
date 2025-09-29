<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { ClockRotation } from '../domain/ClockRotation';
	import ClockFace from './ClockFace.svelte';
	import ClockHand from './ClockHand.svelte';
	import { CLOCK_FACE_SIZE } from '../domain/consts';

	type Props = {
		x: number;
		y: number;
		rotation?: ClockRotation;
		rawRotation?: [number, number] | null;
		delay?: number;
		renderingType?: 'webgl' | 'svg' | 'html';
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

	const {
		x,
		y,
		rotation = '',
		rawRotation = [0, 0],
		delay,
		renderingType = 'webgl'
	}: Props = $props();
	let firstAngle = $state(0);
	let secondAngle = $state(0);
	let rendered = $state(false);

	$effect(() => {
		if (!rendered) {
			return;
		}

		// const nextAngle = ROTATION_ANGLES[rotation];
		// untrack(() => (firstAngle = nextAngle[0]));
		// untrack(() => (secondAngle = nextAngle[1]));
	});

	onMount(() => {
		const t = setTimeout(() => {
			rendered = true;
		}, delay);

		return () => clearTimeout(t);
	});

	// Calculate center of the clock for SVG rotation transform
	const centerX = $derived(x + CLOCK_FACE_SIZE / 2);
	const centerY = $derived(y + CLOCK_FACE_SIZE / 2);

	// Get the actual angles to use (either raw angles from wondering mode or predefined angles)
	const actualFirstAngle = $derived(rawRotation?.[0] ?? firstAngle);
	const actualSecondAngle = $derived(rawRotation?.[1] ?? secondAngle);
</script>

{#if rendered}
	{#if renderingType === 'webgl'}
		<ClockFace {x} {y}>
			<ClockHand angle={actualFirstAngle} />
			<ClockHand angle={actualSecondAngle} />
		</ClockFace>
	{:else if renderingType === 'svg'}
		<g>
			<!-- Clock face with direct SVG circle -->
			<circle
				cx={centerX}
				cy={centerY}
				r={CLOCK_FACE_SIZE / 2}
				fill="none"
				stroke="#e5e5e5"
				stroke-width="1"
			/>

			<!-- Clock hands using ClockHand component with direct SVG -->
			<ClockHand angle={actualFirstAngle} renderingType="svg" {centerX} {centerY} />
			<ClockHand angle={actualSecondAngle} renderingType="svg" {centerX} {centerY} />
		</g>
	{:else if renderingType === 'html'}
		<div
			class="absolute rounded-full border border-gray-300 bg-white"
			style="
				width: {CLOCK_FACE_SIZE}px;
				height: {CLOCK_FACE_SIZE}px;
				left: {x}px;
				top: {y}px;
			"
		>
			<ClockHand angle={actualFirstAngle} renderingType="html" />
			<ClockHand angle={actualSecondAngle} renderingType="html" />
		</div>
	{/if}
{/if}
