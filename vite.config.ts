import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		{
			name: 'full-reload',
			handleHotUpdate({ server }) {
				server.ws.send({
					type: 'full-reload',
					path: '*'
				});
			}
		}
	],
	server: {
		hmr: {
			overlay: false
		}
	}
});
