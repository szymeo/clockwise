<script lang="ts">
	import { deg2rad } from '$lib/application/rad2deg';
	import { CLOCK_HAND_HEIGHT, CLOCK_FACE_SIZE } from '$lib/domain/consts';
	import { Rectangle, Sprite } from 'glixy';
	import { Tween } from 'svelte/motion';

	type Props = {
		angle: number;
		renderingType?: 'webgl' | 'svg' | 'html';
		centerX?: number;
		centerY?: number;
	};

	const { angle: rawAngle, renderingType = 'webgl', centerX = 0, centerY = 0 }: Props = $props();

	const duration = 1200;
	const angle = $derived(new Tween(0));

	const updateAngle = (newAngle: number) => {
		const current = angle.current;
		const norm = (a: number) => ((a % 360) + 360) % 360;

		const from = norm(current);
		const to = norm(newAngle);
		const delta = (to - from + 360) % 360;

		const nextPhase = current + delta;

		angle.set(nextPhase);
	};

	$effect(() => {
		updateAngle(rawAngle);
	});

	// For direct SVG rendering, calculate line end position
	const lineLength = CLOCK_FACE_SIZE / 2 - 2;
	const svgAngle = $derived(angle.current); // Direct angle for SVG coordinate system
	const lineEndX = $derived(centerX + lineLength * Math.cos((svgAngle * Math.PI) / 180));
	const lineEndY = $derived(centerY + lineLength * Math.sin((svgAngle * Math.PI) / 180));
</script>

{#if renderingType === 'webgl'}
	<Sprite
		x={0}
		y={0}
		anchor={{ x: 0, y: 0.5 }}
		width={CLOCK_FACE_SIZE / 2 + CLOCK_HAND_HEIGHT / 2}
		height={CLOCK_HAND_HEIGHT}
		texture="/clockhand.png"
		rotation={deg2rad(angle.current)}
	/>
{:else if renderingType === 'svg'}
	<line
		x1={centerX}
		y1={centerY}
		x2={lineEndX}
		y2={lineEndY}
		stroke="#000000"
		stroke-width="2"
		stroke-linecap="round"
	/>
{:else if renderingType === 'html'}
	<div
		class="absolute rounded-full bg-black"
		style="
			width: {lineLength}px;
			height: 2px;
			left: 50%;
			top: 50%;
			transform-origin: 0 50%;
			transform: translate(0, -50%) rotate({angle.current}deg);
		"
	></div>
{/if}
