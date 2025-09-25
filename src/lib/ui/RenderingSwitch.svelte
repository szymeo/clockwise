<script lang="ts">
	export type RenderingType = 'html' | 'svg' | 'webgl';

	let {
		value = $bindable('html'),
		options = ['html', 'svg', 'webgl'] as RenderingType[]
	}: {
		value: RenderingType;
		options?: RenderingType[];
	} = $props();

	function handleClick(option: RenderingType) {
		value = option;
	}
</script>

<div class="inline-flex rounded-full border border-white/20 bg-gray-200 p-1 backdrop-blur-md">
	<div class="relative grid w-60 grid-cols-3 overflow-hidden rounded-full bg-transparent">
		<div
			class="absolute top-0 left-0 h-full w-1/3 rounded-full bg-gray-300 transition-transform duration-300 ease-out"
			style:transform="translateX({options.indexOf(value) * 100}%)"
		></div>
		{#each options as option (option)}
			<button
				class="relative z-10 w-full cursor-pointer border-none bg-transparent py-2 text-center text-sm font-medium tracking-wider text-black/60 uppercase transition-all duration-300 ease-out select-none hover:text-black/80 focus:outline-none"
				onclick={() => handleClick(option)}
			>
				{option}
			</button>
		{/each}
	</div>
</div>
