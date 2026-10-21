// Heurísticas para el problema del agente viajero (TSP).
// Se usan en el mapa de cafeterías (rutas abiertas con inicio fijo) y en el artículo (recorridos cerrados).

export type Dist = (i: number, j: number) => number;
export interface LatLng {
	lat: number;
	lng: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en línea recta sobre la superficie de la Tierra, en kilómetros. */
export function haversine(a: LatLng, b: LatLng): number {
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pathLength(order: number[], d: Dist, closed = false): number {
	let total = 0;
	for (let i = 1; i < order.length; i++) total += d(order[i - 1], order[i]);
	if (closed && order.length > 2) total += d(order[order.length - 1], order[0]);
	return total;
}

/** Vecino más cercano: desde el punto actual, ir siempre al más cercano que falte. O(n²). */
export function nearestNeighbor(n: number, d: Dist, start = 0): number[] {
	if (n === 0) return [];
	const visited = new Array<boolean>(n).fill(false);
	const order = [start];
	visited[start] = true;
	for (let k = 1; k < n; k++) {
		const last = order[order.length - 1];
		let best = -1;
		let bestD = Number.POSITIVE_INFINITY;
		for (let j = 0; j < n; j++) {
			if (visited[j]) continue;
			const dj = d(last, j);
			if (dj < bestD) {
				bestD = dj;
				best = j;
			}
		}
		visited[best] = true;
		order.push(best);
	}
	return order;
}

function reverse(arr: number[], i: number, k: number) {
	while (i < k) {
		const t = arr[i];
		arr[i] = arr[k];
		arr[k] = t;
		i++;
		k--;
	}
}

/**
 * 2-opt: mientras exista un par de aristas cuyo intercambio acorte el recorrido, invierte el tramo entre ellas.
 * El primer punto queda fijo (sirve como inicio de una ruta abierta). `onStep` recibe cada mejora, para animarla.
 */
export function twoOpt(order: number[], d: Dist, closed = false, onStep?: (o: number[]) => void): number[] {
	const o = order.slice();
	const n = o.length;
	if (n < 3) return o;
	let improved = true;
	let guard = 0;
	while (improved && guard++ < 2000) {
		improved = false;
		for (let i = 1; i < n - 1; i++) {
			for (let k = i + 1; k < n; k++) {
				const a = o[i - 1];
				const b = o[i];
				const c = o[k];
				const next = k + 1 < n ? o[k + 1] : closed ? o[0] : -1;
				const before = d(a, b) + (next >= 0 ? d(c, next) : 0);
				const after = d(a, c) + (next >= 0 ? d(b, next) : 0);
				if (after + 1e-9 < before) {
					reverse(o, i, k);
					improved = true;
					onStep?.(o.slice());
				}
			}
		}
	}
	return o;
}

/** Fuerza bruta para recorridos cerrados: prueba las (n-1)! permutaciones con el primer punto fijo. */
export function bruteForce(n: number, d: Dist): { order: number[]; evaluated: number } {
	if (n < 3) return { order: [...Array(n).keys()], evaluated: 1 };
	const rest = [...Array(n - 1).keys()].map((i) => i + 1);
	let best: number[] = [0, ...rest];
	let bestLen = pathLength(best, d, true);
	let evaluated = 0;
	const perm = (arr: number[], l: number) => {
		if (l === arr.length) {
			evaluated++;
			const order = [0, ...arr];
			const len = pathLength(order, d, true);
			if (len < bestLen - 1e-9) {
				bestLen = len;
				best = order;
			}
			return;
		}
		for (let i = l; i < arr.length; i++) {
			[arr[l], arr[i]] = [arr[i], arr[l]];
			perm(arr, l + 1);
			[arr[l], arr[i]] = [arr[i], arr[l]];
		}
	};
	perm(rest, 0);
	return { order: best, evaluated };
}

/** Número de recorridos cerrados distintos con n paradas: (n-1)!/2. */
export function tourCount(n: number): bigint {
	if (n < 3) return 1n;
	let f = 1n;
	for (let i = 2n; i <= BigInt(n - 1); i++) f *= i;
	return f / 2n;
}
