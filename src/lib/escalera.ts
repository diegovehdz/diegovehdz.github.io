// Lógica de Escalera: un grafo donde cada palabra se conecta con las que difieren en una sola letra.
// El "par" del día es la distancia más corta a la meta (búsqueda en anchura) usando solo palabras comunes.
import { mulberry32 } from './rng';

export const ALFABETO = 'abcdefghijklmnñopqrstuvwxyz';

/** Palabras que difieren de `w` en exactamente una letra y están en el diccionario. */
export function vecinos(w: string, dict: Set<string>): string[] {
	const out: string[] = [];
	for (let i = 0; i < w.length; i++) {
		for (const c of ALFABETO) {
			if (c === w[i]) continue;
			const v = w.slice(0, i) + c + w.slice(i + 1);
			if (dict.has(v)) out.push(v);
		}
	}
	return out;
}

/** Distancia (en pasos) de cada palabra a `meta`, por búsqueda en anchura. */
export function distancias(meta: string, dict: Set<string>): Map<string, number> {
	const dist = new Map<string, number>([[meta, 0]]);
	const cola = [meta];
	for (let h = 0; h < cola.length; h++) {
		const w = cola[h];
		const d = dist.get(w)!;
		for (const v of vecinos(w, dict)) {
			if (dist.has(v)) continue;
			dist.set(v, d + 1);
			cola.push(v);
		}
	}
	return dist;
}

/** Posición de la única letra que cambia entre a y b; -1 si son iguales, -2 si cambia más de una. */
export function cambio(a: string, b: string): number {
	let idx = -1;
	for (let i = 0; i < a.length; i++) {
		if (a[i] === b[i]) continue;
		if (idx >= 0) return -2;
		idx = i;
	}
	return idx;
}

/** Siguiente palabra en un camino óptimo hacia la meta, prefiriendo palabras comunes. */
export function pista(w: string, dict: Set<string>, comunes: Set<string>, distComun: Map<string, number>, distTotal: Map<string, number>) {
	const vs = vecinos(w, dict);
	// si ya estamos en el grafo de palabras comunes, el siguiente escalón común más cercano a la meta
	let mejor: string | null = null;
	let dMejor = Infinity;
	for (const v of vs) {
		if (!comunes.has(v)) continue;
		const d = distComun.get(v);
		if (d !== undefined && d < dMejor) {
			dMejor = d;
			mejor = v;
		}
	}
	const dActual = distComun.get(w) ?? Infinity;
	if (mejor && dMejor < dActual) return mejor;
	// si no, cualquier palabra que acerque en el diccionario completo
	const dw = distTotal.get(w) ?? Infinity;
	return vs.find((v) => (distTotal.get(v) ?? Infinity) < dw) ?? mejor;
}

/** Día del calendario en la Ciudad de México, como número de días desde 1970-01-01. */
export function diaCDMX(date = new Date()): number {
	const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
	return diaDeFecha(s);
}

export function diaDeFecha(iso: string): number {
	const [y, m, d] = iso.split('-').map(Number);
	return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Minutos que faltan para la medianoche en la Ciudad de México. */
export function minutosParaMedianoche(date = new Date()): number {
	const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
	const h = Number(p.find((x) => x.type === 'hour')?.value ?? 0);
	const m = Number(p.find((x) => x.type === 'minute')?.value ?? 0);
	return 24 * 60 - (h * 60 + m);
}

/** Barajado de Fisher–Yates con semilla: el orden de las palabras de partida es el mismo para todos. */
export function barajar<T>(arr: readonly T[], semilla: number): T[] {
	const out = [...arr];
	const rand = mulberry32(semilla);
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Texto para compartir: una fila por paso con la letra que cambió, sin revelar las palabras (como en Poople). */
export function textoCompartir(opts: { numero: number | null; escalones: string[]; par: number; pistas: number; url: string }) {
	const { numero, escalones, par, pistas, url } = opts;
	const pasos = escalones.length - 1;
	const filas: string[] = [];
	for (let i = 1; i < escalones.length; i++) {
		const k = cambio(escalones[i - 1], escalones[i]);
		filas.push([0, 1, 2, 3].map((j) => (j === k ? '🟥' : '⬛')).join(''));
	}
	const titulo = numero ? `Escalera #${numero}` : 'Escalera (práctica)';
	const extra = pistas ? ` · ${pistas} pista${pistas > 1 ? 's' : ''}` : '';
	return `${titulo} · ${pasos} pasos (par ${par})${extra}\n${filas.join('\n')}\n💩\n${url}`;
}
