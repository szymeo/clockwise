<script lang="ts">
	import Clock from './Clock.svelte';
	import { NUMBERS_CLOCK_SCHEME } from '../domain/scheme';

	type Props = {
		number: number;
	};

	const { number }: Props = $props();
</script>

<div class="flex flex-col">
	{#each [0, 1, 2, 3, 4, 5] as row}
		<div class="flex">
			<Clock rotation={NUMBERS_CLOCK_SCHEME[number][row][0]} />
			<Clock rotation={NUMBERS_CLOCK_SCHEME[number][row][1]} />
			<Clock rotation={NUMBERS_CLOCK_SCHEME[number][row][2]} />
			<Clock rotation={NUMBERS_CLOCK_SCHEME[number][row][3]} />
		</div>
	{/each}
</div>
