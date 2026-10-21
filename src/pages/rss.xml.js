import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE } from '../config/site';

export async function GET(context) {
	const textos = (await getCollection('textos', ({ data }) => !data.draft)).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
	return rss({
		title: `Textos — ${SITE.fullName}`,
		description: 'Divulgación de computación, algoritmos, datos y simulación, con ejemplos de la Ciudad de México.',
		site: context.site,
		customData: '<language>es-mx</language>',
		items: textos.map((t) => ({
			title: t.data.title,
			description: t.data.description,
			pubDate: t.data.pubDate,
			link: `/textos/${t.id}/`,
		})),
	});
}
