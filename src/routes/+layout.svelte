<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { CLASSIC, TRIP } from '$lib/game/modes';
	import ClockWall from '$lib/ui/ClockWall.svelte';
	import StartScreen from '$lib/ui/StartScreen.svelte';

	let { children } = $props();

	// Every route is a mode of one wall: switching keeps the clocks and the start screen in place.
	const mode = $derived(page.route.id === '/trip' ? TRIP : CLASSIC);
	let wall = $state<ReturnType<typeof ClockWall>>();
	let started = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ClockWall bind:this={wall} {mode} waiting={!started} />
<StartScreen
	onstart={(x, y) => {
		started = true;
		wall?.drop(x, y);
	}}
/>
{@render children?.()}
