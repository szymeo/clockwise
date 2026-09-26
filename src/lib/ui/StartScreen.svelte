<!--
	Start screen over the still wall, on every load. Start goes fullscreen and drops a tear from the button,
	Esc starts without fullscreen.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { onstart }: { onstart: (x: number, y: number) => void } = $props();

	let button: HTMLButtonElement;

	const modes = [
		{ href: resolve('/'), label: 'Classic' },
		{ href: resolve('/trip'), label: 'Trip' }
	];
	const current = $derived(modes.findIndex(({ href }) => href === page.url.pathname));

	function start(event: Event) {
		if (event.type === 'submit') document.documentElement.requestFullscreen?.().catch(() => {});
		const { left, top, width, height } = button.getBoundingClientRect();
		onstart(left + width / 2, top + height / 2);
	}
</script>

<dialog {@attach (dialog) => dialog.showModal()} oncancel={start} aria-labelledby="start-title">
	<h1 id="start-title">clockwise</h1>
	<p>A wall of analog clocks that together tell the time.</p>
	<form method="dialog" onsubmit={start}>
		<button bind:this={button}>Start</button>
	</form>
	<footer>
		<nav class="tabs" aria-label="Mode">
			{#if current >= 0}
				<span class="indicator" aria-hidden="true" style:translate="calc({current} * (100% + 2px))"
				></span>
			{/if}
			{#each modes as { href, label }, i (href)}
				<a {href} aria-current={i === current ? 'page' : undefined}>{label}</a>
			{/each}
		</nav>
		<a
			class="github"
			href="https://github.com/szymeo/clockwise"
			target="_blank"
			rel="noreferrer"
			aria-label="GitHub (opens in a new tab)"
		>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path
					fill="currentColor"
					d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
				/>
			</svg>
			GitHub
			<svg class="external" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M7 17 17 7M8 7h9v9"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</a>
	</footer>
</dialog>

<style>
	dialog {
		--text: light-dark(#0a0a0a, #f5f5f5);
		--muted: light-dark(#737373, #a3a3a3);
		--line: light-dark(#e5e5e5, #262626);
		box-sizing: border-box;
		width: min(100vw - 2rem, 22rem);
		padding: 2.5rem 1.5rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 1.25rem;
		background: light-dark(#fff, #0a0a0a);
		color: var(--text);
		box-shadow:
			0 1px 3px 0 rgb(0 0 0 / 0.1),
			0 1px 2px -1px rgb(0 0 0 / 0.1);
		font:
			15px/1.5 system-ui,
			sans-serif;
		text-align: center;
		transition:
			opacity 0.3s ease-out,
			scale 0.3s ease-out,
			overlay 0.3s allow-discrete,
			display 0.3s allow-discrete;
	}

	dialog:not([open]) {
		opacity: 0;
		scale: 0.96;
	}

	dialog::backdrop {
		background: light-dark(rgb(255 255 255 / 0.4), rgb(10 10 10 / 0.4));
		backdrop-filter: blur(4px);
		transition:
			opacity 0.3s ease-out,
			overlay 0.3s allow-discrete,
			display 0.3s allow-discrete;
	}

	dialog:not([open])::backdrop {
		opacity: 0;
	}

	@starting-style {
		dialog[open],
		dialog[open]::backdrop {
			opacity: 0;
		}

		dialog[open] {
			scale: 0.96;
		}
	}

	h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}

	p {
		margin: 0.5rem 0 0;
		color: var(--muted);
		text-wrap: balance;
	}

	button {
		margin-top: 1.75rem;
		padding: 0.7rem 2.25rem;
		border: 0;
		border-radius: 999px;
		background: var(--text);
		color: light-dark(#fff, #0a0a0a);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition:
			scale 0.15s ease-out,
			opacity 0.15s ease-out,
			box-shadow 0.15s ease-out;
	}

	button:active {
		scale: 0.97;
	}

	/* Start has focus on load so Enter starts: a soft halo, a real outline in forced colors. */
	button:focus-visible {
		outline: 2px solid transparent;
		box-shadow: 0 0 0 5px light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.14));
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
	}

	a {
		color: var(--muted);
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		transition: color 0.18s ease;
	}

	a:focus-visible {
		outline: 2px solid var(--text);
		outline-offset: 1px;
	}

	/* Two equal segments on a track, the raised one slides to the current mode. */
	.tabs {
		position: relative;
		display: inline-grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 2px;
		border-radius: 9px;
		background: light-dark(#f5f5f5, #171717);
		isolation: isolate;
	}

	.indicator {
		position: absolute;
		top: 2px;
		bottom: 2px;
		left: 2px;
		z-index: -1;
		width: calc(50% - 3px);
		border-radius: 7px;
		background: light-dark(#fff, #262626);
		box-shadow:
			inset 0 0 0 0.5px light-dark(#d4d4d4, #404040),
			0 1px 2px rgb(0 0 0 / 0.08);
		transition: translate 0.32s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.tabs a {
		display: grid;
		place-items: center;
		height: 28px;
		padding: 0 12px;
		border-radius: 7px;
	}

	.tabs a[aria-current] {
		color: var(--text);
	}

	.github {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 2px;
		border-radius: 4px;
	}

	.github svg {
		width: 15px;
		height: 15px;
	}

	.github .external {
		width: 12px;
		height: 12px;
		margin-left: -2px;
	}

	@media (hover: hover) {
		button:hover {
			opacity: 0.85;
		}

		a:hover {
			color: light-dark(#525252, #d4d4d4);
		}

		.tabs a[aria-current]:hover {
			color: var(--text);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		dialog,
		dialog::backdrop,
		button,
		a,
		.indicator {
			transition: none;
		}
	}
</style>
