<script lang="ts">
	import { deg2rad } from '$lib/application/rad2deg';
	import { CLOCK_HAND_HEIGHT, CLOCK_FACE_SIZE } from '$lib/domain/consts';
	import { Rectangle } from 'glixy';
	import { Tween } from 'svelte/motion';

	type Props = {
		angle: number;
	};

	const { angle: rawAngle }: Props = $props();

	const duration = 1200;
	const angle = $derived(new Tween(0, { duration }));

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
</script>

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
