<script lang="ts">
	import { clocksRenderer } from '$lib/application/clocks-renderer.svelte';
	import Clock from '$lib/ui/Clock.svelte';
	import SvgUseClock from '$lib/ui/SvgUseClock.svelte';
	import RenderingSwitch from '$lib/ui/RenderingSwitch.svelte';
	import { onMount, untrack } from 'svelte';
	import { Stage } from 'glixy';
	import { CLOCK_FACE_SIZE } from '$lib/domain/consts';

	let currentTime = $state(new Date());
	let boardWidth = $state(0);
	let boardHeight = $state(0);
	let host: HTMLElement | null = $state(null);

	const xClocks = $derived(Math.floor(boardWidth / CLOCK_FACE_SIZE));
	const yClocks = $derived(Math.floor(boardHeight / CLOCK_FACE_SIZE));

	$effect(() => {
		clocksRenderer.init(xClocks, yClocks);
	});

	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	const hours = $derived(currentTime.getHours().toString().padStart(2, '0'));
	const minutes = $derived(currentTime.getMinutes().toString().padStart(2, '0'));
	const time = $derived(hours + minutes);

	$effect(() => {
		time;
		untrack(() => clocksRenderer.render(time));
	});

	onMount(() => {
		const listener = () => {
			if (document.visibilityState === 'visible') {
				clocksRenderer.stopWondering();
			} else {
				clocksRenderer.startWondering();
			}
		};

		window.addEventListener('visibilitychange', listener);

		return () => {
			window.removeEventListener('visibilitychange', listener);
		};
	});

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'w' || event.key === 'W') {
			if (clocksRenderer.wondering) {
				clocksRenderer.stopWondering();
			} else {
				clocksRenderer.startWondering();
			}
			console.log('Wondering mode:', clocksRenderer.wondering);
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Floating Rendering Switch -->
<div class="fixed top-8 left-1/2 z-10 -translate-x-1/2 transform">
	<RenderingSwitch bind:value={clocksRenderer.renderingType} />
</div>

<div
	class="flex h-dvh w-full items-center justify-center"
	bind:clientWidth={boardWidth}
	bind:clientHeight={boardHeight}
	bind:this={host}
>
	{#if clocksRenderer.renderingType === 'webgl'}
		{#if host}
			<Stage background="#ffffff" {host} antialias={true}>
				{#each Array.from({ length: xClocks }).map((_, i) => i) as i}
					<div class="flex flex-col">
						{#each Array.from({ length: yClocks }).map((_, j) => j) as j}
							<Clock
								x={i * (CLOCK_FACE_SIZE + 1)}
								y={j * (CLOCK_FACE_SIZE + 1)}
								rotation={clocksRenderer.cellRotation(i, j)}
								rawRotation={clocksRenderer.cellRawRotation(i, j)}
								delay={i * 10 + j * 10}
							/>
						{/each}
					</div>
				{/each}
			</Stage>
		{:else}
			<div>Loading stage...</div>
		{/if}
	{/if}

	{#if clocksRenderer.renderingType === 'svg'}
		<svg width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
			{#each Array.from({ length: xClocks }).map((_, i) => i) as i}
				{#each Array.from({ length: yClocks }).map((_, j) => j) as j}
					<Clock
						x={i * (CLOCK_FACE_SIZE + 1)}
						y={j * (CLOCK_FACE_SIZE + 1)}
						rotation={clocksRenderer.cellRotation(i, j)}
						rawRotation={clocksRenderer.cellRawRotation(i, j)}
						delay={i * 10 + j * 10}
						renderingType="svg"
					/>
				{/each}
			{/each}
		</svg>
	{/if}

	{#if clocksRenderer.renderingType === 'svg-use'}
		<svg width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`}>
			<defs>
				<!-- Single clock symbol with CSS variable controlled hand rotations -->
				<symbol id="clock" viewBox={`0 0 ${CLOCK_FACE_SIZE} ${CLOCK_FACE_SIZE}`}>
					<!-- Clock face -->
					<circle
						cx={CLOCK_FACE_SIZE / 2}
						cy={CLOCK_FACE_SIZE / 2}
						r={CLOCK_FACE_SIZE / 2}
						fill="none"
						stroke="#e5e5e5"
						stroke-width="2"
					/>

					<!-- First hand controlled by CSS variable -->
					<line
						class="clock-hand-1"
						x1={CLOCK_FACE_SIZE / 2}
						y1={CLOCK_FACE_SIZE / 2}
						x2={CLOCK_FACE_SIZE - 2}
						y2={CLOCK_FACE_SIZE / 2}
						stroke="#000000"
						stroke-width="2"
						stroke-linecap="round"
						style="transform-origin: {CLOCK_FACE_SIZE / 2}px {CLOCK_FACE_SIZE /
							2}px; transform: rotate(var(--hand1-rotation, 0deg));will-change: transform;"
					/>

					<!-- Second hand controlled by CSS variable -->
					<line
						class="clock-hand-2"
						x1={CLOCK_FACE_SIZE / 2}
						y1={CLOCK_FACE_SIZE / 2}
						x2={CLOCK_FACE_SIZE - 2}
						y2={CLOCK_FACE_SIZE / 2}
						stroke="#000000"
						stroke-width="2"
						stroke-linecap="round"
						style="transform-origin: {CLOCK_FACE_SIZE / 2}px {CLOCK_FACE_SIZE /
							2}px; transform: rotate(var(--hand2-rotation, 0deg));will-change: transform;"
					/>
				</symbol>
			</defs>

			{#each Array.from({ length: xClocks }).map((_, i) => i) as i}
				{#each Array.from({ length: yClocks }).map((_, j) => j) as j}
					<SvgUseClock
						x={i * (CLOCK_FACE_SIZE + 1)}
						y={j * (CLOCK_FACE_SIZE + 1)}
						rotation={clocksRenderer.cellRotation(i, j)}
						rawRotation={clocksRenderer.cellRawRotation(i, j)}
						delay={i * 10 + j * 10}
					/>
				{/each}
			{/each}
		</svg>
	{/if}
</div>
