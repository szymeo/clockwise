<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { ClockRotation } from '../domain/ClockRotation';
	import ClockFace from './ClockFace.svelte';
	import ClockHand from './ClockHand.svelte';

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
	let firstAngle = $state(0);
	let secondAngle = $state(0);
	let rendered = $state(false);

	$effect(() => {
		const nextAngle = ROTATION_ANGLES[rotation];
		untrack(() => (firstAngle = nextAngle[0]));
		untrack(() => (secondAngle = nextAngle[1]));
	});

	onMount(() => {
		const t = setTimeout(() => {
			rendered = true;
		}, delay);

		return () => clearTimeout(t);
	});
</script>

{#if rendered}
	<ClockFace {x} {y}>
		<ClockHand angle={rawRotation?.[0] ?? firstAngle} />
		<ClockHand angle={rawRotation?.[1] ?? secondAngle} />
	</ClockFace>
{/if}
