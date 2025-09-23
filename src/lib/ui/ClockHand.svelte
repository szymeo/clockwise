<script lang="ts">
	import { deg2rad } from '$lib/application/rad2deg';
	import { CLOCK_HAND_HEIGHT, CLOCK_FACE_SIZE } from '$lib/domain/consts';
	import { Rectangle } from 'glixy';
	import { Tween } from 'svelte/motion';

	type Props = {
		angle: number;
		renderingType?: 'webgl' | 'svg';
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
	<Rectangle
		x={0}
		y={0}
		anchor={{ x: CLOCK_HAND_HEIGHT / 2, y: CLOCK_HAND_HEIGHT / 2 }}
		width={CLOCK_FACE_SIZE / 2 + CLOCK_HAND_HEIGHT / 2}
		height={CLOCK_HAND_HEIGHT}
		cornerRadius={50}
		background={{
			color: 0x000000,
			opacity: 1
		}}
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
{/if}
