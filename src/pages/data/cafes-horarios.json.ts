// Horarios compactos de las cafeterías para la píldora del encabezado ("N abiertas ahora").
import type { APIRoute } from 'astro';
import cafes from '../../data/cafes.json';

export const GET: APIRoute = () => {
	const rows = cafes.filter((c) => 'horario' in c && c.horario).map((c) => [c.id, (c as { horario: string }).horario]);
	return new Response(JSON.stringify({ total: cafes.length, horarios: rows }), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};
