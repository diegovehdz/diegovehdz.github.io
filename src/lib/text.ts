/** Minutos de lectura aproximados (220 palabras por minuto), ignorando código e importaciones de MDX. */
export function readingTime(body = ''): number {
	const text = body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/^import .*$/gm, ' ')
		.replace(/<[^>]+>/g, ' ');
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}
