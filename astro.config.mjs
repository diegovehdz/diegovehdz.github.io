// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Cambia esto por tu dominio final (también en src/config/site.ts).
	site: 'https://diegovehdz.github.io',
	integrations: [mdx(), sitemap()],
	prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
	// Para compartir el sitio local con el reenvío de puertos de VS Code (túneles *.devtunnels.ms).
	// Solo afecta a `astro dev` y `astro preview`, no al sitio publicado.
	server: { allowedHosts: ['.devtunnels.ms'] },
	markdown: {
		// Los colores del código salen de variables CSS para que sigan al tema claro/oscuro.
		shikiConfig: { theme: 'css-variables' },
	},
});
