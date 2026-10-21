#!/usr/bin/env node
// Importa cafeterías desde un mapa de Google My Maps exportado como KML y las mezcla con src/data/cafes.json.
//
// En My Maps: menú ⋮ → "Exportar a KML/KMZ" → marca "Exportar como KML en lugar de KMZ".
// Uso:
//   npm run cafes:import -- ruta/al/mapa.kml            (muestra lo que haría, sin escribir)
//   npm run cafes:import -- ruta/al/mapa.kml --write    (escribe src/data/cafes.json)
//
// - El nombre de cada capa (Folder) se usa como etiqueta (p. ej. "especialidad").
// - La descripción del lugar se guarda como tu nota.
// - Si ya existe una cafetería a menos de 60 m con nombre parecido, se actualiza en lugar de duplicarla.
// - Las nuevas no traen colonia/alcaldía: complétalas a mano o con `npm run cafes:osm -- "Nombre"`.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , file, ...flags] = process.argv;
if (!file) {
	console.error('Uso: npm run cafes:import -- archivo.kml [--write]');
	process.exit(1);
}
const write = flags.includes('--write');
const dataPath = resolve('src/data/cafes.json');

const decode = (s = '') =>
	s
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.trim();
const tag = (xml, name) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
const norm = (s) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
const slug = (s) => norm(s).replace(/\s+/g, '-').slice(0, 60);
const meters = (a, b) => {
	const R = 6371000;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));
};

const kml = readFileSync(resolve(file), 'utf8');
const found = [];
const folders = [...kml.matchAll(/<Folder>([\s\S]*?)<\/Folder>/g)].map((m) => m[1]);
const chunks = folders.length ? folders : [kml];
for (const chunk of chunks) {
	const layer = folders.length ? decode(tag(chunk, 'name')) : '';
	for (const [, pm] of chunk.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
		const coords = tag(pm, 'coordinates')?.trim().split(/\s+/)[0];
		if (!coords) continue;
		const [lng, lat] = coords.split(',').map(Number);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		found.push({ nombre: decode(tag(pm, 'name')) || 'Sin nombre', nota: decode(tag(pm, 'description')), lat, lng, layer });
	}
}

const cafes = JSON.parse(readFileSync(dataPath, 'utf8'));
let added = 0;
let updated = 0;
for (const f of found) {
	const layerTag = f.layer ? norm(f.layer) : '';
	const match = cafes.find((c) => meters(c, f) < 60 && (norm(c.nombre).includes(norm(f.nombre)) || norm(f.nombre).includes(norm(c.nombre))));
	if (match) {
		if (f.nota) match.nota = f.nota;
		if (layerTag && !match.tags.includes(layerTag)) match.tags.push(layerTag);
		updated++;
		console.log(`  ~ ${match.nombre}`);
		continue;
	}
	let id = slug(f.nombre);
	while (cafes.some((c) => c.id === id)) id += '-2';
	cafes.push({
		id,
		nombre: f.nombre,
		lat: Number(f.lat.toFixed(6)),
		lng: Number(f.lng.toFixed(6)),
		colonia: '',
		alcaldia: '',
		direccion: '',
		tags: layerTag ? [layerTag] : [],
		fuente: 'mymaps',
		nota: f.nota,
		visitado: false,
		favorito: false,
	});
	added++;
	console.log(`  + ${f.nombre}`);
}

console.log(`\n${found.length} lugares en el KML · ${added} nuevos · ${updated} actualizados`);
if (write) {
	writeFileSync(dataPath, `${JSON.stringify(cafes, null, 2)}\n`);
	console.log(`Escrito en ${dataPath}`);
} else {
	console.log('Modo de prueba: agrega --write para guardar los cambios.');
}
