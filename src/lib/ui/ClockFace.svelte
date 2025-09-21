<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Rectangle } from 'glixy';
	import { CLOCK_FACE_SIZE } from '$lib/domain/consts';

	let { children, x, y }: { children?: Snippet; x?: number; y?: number } = $props();
</script>

<Container {x} {y}>
	<Rectangle
		x={0}
		y={0}
		width={CLOCK_FACE_SIZE}
		height={CLOCK_FACE_SIZE}
		cornerRadius={50}
		background={{
			color: 0xffffff,
			opacity: 1
		}}
		border={{
			color: 0xebebeb,
			width: 2,
			opacity: 1,
			rounded: true
		}}
	/>
	<Container x={CLOCK_FACE_SIZE / 2} y={CLOCK_FACE_SIZE / 2}>
		{@render children?.()}
	</Container>
</Container>
