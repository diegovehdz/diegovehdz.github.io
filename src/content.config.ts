import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const proyectos = defineCollection({
	loader: glob({ base: './src/content/proyectos', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		kicker: z.string(),
		summary: z.string(),
		year: z.number(),
		period: z.string().optional(),
		context: z.string().optional(),
		role: z.string(),
		team: z.string().optional(),
		stack: z.array(z.string()).default([]),
		tags: z.array(z.enum(['web', 'sistemas', 'ia', 'datos', 'simulacion', 'algoritmos', 'juegos'])).default([]),
		featured: z.boolean().default(false),
		order: z.number().default(100),
		visual: z
			.enum([
				'monarca',
				'trafico',
				'emergencias',
				'mercado',
				'arcane',
				'montana',
				'agentes',
				'algoritmos',
				'ml',
				'apis',
				'bungee',
				'sitio',
				'abnormality',
				'bordes',
				'covid',
			])
			.optional(),
		links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
		/** juego jugable en la página del proyecto: un build de Unity Play o el port web de Abnormality */
		play: z
			.object({
				kind: z.enum(['unity', 'abnormality']),
				url: z.string().optional(),
				note: z.string().optional(),
				/** imagen tramada de public/art/ para el póster del juego */
				poster: z.string().optional(),
			})
			.optional(),
		draft: z.boolean().default(false),
	}),
});

const textos = defineCollection({
	loader: glob({ base: './src/content/textos', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		kicker: z.string().optional(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

export const collections = { proyectos, textos };
