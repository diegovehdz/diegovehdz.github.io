#!/usr/bin/env node
// Busca una cafetería por nombre en OpenStreetMap (dentro de la CDMX) y genera la entrada lista para cafes.json.
//
// Uso:
//   npm run cafes:osm -- "Café Avellaneda"
//   npm run cafes:osm -- "Almanegra" --add       (agrega el primer resultado a src/data/cafes.json)
//
// Usa los servicios públicos de Overpass y Nominatim: no los llames en bucle (máximo ~1 consulta por segundo).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const add = args.includes('--add');
const query = args.filter((a) => a !== '--add').join(' ');
if (!query) {
	console.error('Uso: npm run cafes:osm -- "Nombre de la cafetería" [--add]');
	process.exit(1);
}
const UA = { 'User-Agent': 'portafolio-cafes/1.0 (sitio personal)' };
const BBOX = '19.18,-99.37,19.60,-98.94';
const norm = (s) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
const slug = (s) => norm(s).replace(/\s+/g, '-').slice(0, 60);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&');

const ql = `[out:json][timeout:60];(nwr["amenity"="cafe"]["name"~"${escapeRe(query)}",i](${BBOX}););out center tags 10;`;
const res = await fetch('https://overpass-api.de/api/interpreter', {
	method: 'POST',
	headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
	body: `data=${encodeURIComponent(ql)}`,
});
if (!res.ok) {
	console.error(`Overpass respondió ${res.status}. Intenta de nuevo en un minuto.`);
	process.exit(1);
}
const { elements = [] } = await res.json();
if (!elements.length) {
	console.log('Sin resultados en OpenStreetMap. Puedes agregarla a mano en src/data/cafes.json.');
	process.exit(0);
}

const entries = [];
for (const e of elements.slice(0, 5)) {
	const lat = e.lat ?? e.center?.lat;
	const lng = e.lon ?? e.center?.lon;
	const t = e.tags ?? {};
	const rev = await fetch(
		`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=17&addressdetails=1&accept-language=es`,
		{ headers: UA },
	).then((r) => r.json());
	await new Promise((r) => setTimeout(r, 1100));
	const a = rev.address ?? {};
	const clean = (s = '') => s.replace(/^(Colonia|Fraccionamiento|Barrio de|Barrio)\s+/, '');
	const entry = {
		id: slug(t.name),
		nombre: t.name,
		lat: Number(lat.toFixed(6)),
		lng: Number(lng.toFixed(6)),
		colonia: clean(a.neighbourhood || a.suburb || a.quarter),
		alcaldia: clean(a.borough || a.city_district || a.municipality || ''),
		direccion: [t['addr:street'] || a.road, t['addr:housenumber'] || a.house_number].filter(Boolean).join(' '),
		tags: [],
		...(t.opening_hours ? { horario: t.opening_hours } : {}),
		...(t.website || t['contact:website'] ? { web: t.website || t['contact:website'] } : {}),
		...(t['contact:instagram'] ? { instagram: t['contact:instagram'] } : {}),
		fuente: `osm:${e.type}/${e.id}`,
		nota: '',
		visitado: false,
		favorito: false,
	};
	entries.push(entry);
	console.log(JSON.stringify(entry, null, 2));
}

if (add) {
	const path = resolve('src/data/cafes.json');
	const cafes = JSON.parse(readFileSync(path, 'utf8'));
	const entry = entries[0];
	if (cafes.some((c) => c.fuente === entry.fuente)) {
		console.log(`\n${entry.nombre} ya estaba en el mapa.`);
	} else {
		while (cafes.some((c) => c.id === entry.id)) entry.id += '-2';
		cafes.push(entry);
		writeFileSync(path, `${JSON.stringify(cafes, null, 2)}\n`);
		console.log(`\nAgregada: ${entry.nombre}. Revisa las etiquetas y escribe tu nota en src/data/cafes.json.`);
	}
}
