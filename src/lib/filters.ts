// Filtros de la app de "Detección de bordes" (Python + OpenCV), reescritos para el navegador.
// Trabajan sobre una imagen en escala de grises (un byte por píxel) y devuelven otra del mismo tamaño.

export type FilterId =
	| 'original'
	| 'grises'
	| 'bin1'
	| 'bin2'
	| 'negativo'
	| 'suavizado'
	| 'ponderado'
	| 'sobel'
	| 'prewitt'
	| 'roberts'
	| 'canny';

export const FILTERS: { id: FilterId; label: string; edge?: boolean }[] = [
	{ id: 'original', label: 'Original' },
	{ id: 'grises', label: 'Escala de grises' },
	{ id: 'bin1', label: 'Binarización 1' },
	{ id: 'bin2', label: 'Binarización 2' },
	{ id: 'negativo', label: 'Negativo' },
	{ id: 'suavizado', label: 'Suavizado' },
	{ id: 'ponderado', label: 'Ponderado' },
	{ id: 'sobel', label: 'Sobel', edge: true },
	{ id: 'prewitt', label: 'Prewitt', edge: true },
	{ id: 'roberts', label: 'Roberts', edge: true },
	{ id: 'canny', label: 'Canny', edge: true },
];

/** Escala de grises como en la app original: promedio simple de los tres canales. */
export function toGray(rgba: Uint8ClampedArray, n: number): Uint8ClampedArray {
	const g = new Uint8ClampedArray(n);
	for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (rgba[j] + rgba[j + 1] + rgba[j + 2]) / 3;
	return g;
}

/** Umbral fijo (la app usaba 128). */
export function threshold(g: Uint8ClampedArray, t: number): Uint8ClampedArray {
	const o = new Uint8ClampedArray(g.length);
	for (let i = 0; i < g.length; i++) o[i] = g[i] >= t ? 255 : 0;
	return o;
}

/** Umbral en el promedio de la imagen ("Binarización 2"). */
export function meanThreshold(g: Uint8ClampedArray): Uint8ClampedArray {
	let s = 0;
	for (let i = 0; i < g.length; i++) s += g[i];
	return threshold(g, s / Math.max(1, g.length));
}

function conv3(g: ArrayLike<number>, w: number, h: number, k: number[], div = 1): Float32Array {
	const o = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		const y0 = y > 0 ? y - 1 : 0;
		const y2 = y < h - 1 ? y + 1 : h - 1;
		for (let x = 0; x < w; x++) {
			const x0 = x > 0 ? x - 1 : 0;
			const x2 = x < w - 1 ? x + 1 : w - 1;
			const s =
				k[0] * g[y0 * w + x0] + k[1] * g[y0 * w + x] + k[2] * g[y0 * w + x2] +
				k[3] * g[y * w + x0] + k[4] * g[y * w + x] + k[5] * g[y * w + x2] +
				k[6] * g[y2 * w + x0] + k[7] * g[y2 * w + x] + k[8] * g[y2 * w + x2];
			o[y * w + x] = s / div;
		}
	}
	return o;
}

const toBytes = (f: Float32Array, scale = 1) => {
	const o = new Uint8ClampedArray(f.length);
	for (let i = 0; i < f.length; i++) o[i] = f[i] * scale;
	return o;
};

/** Promedio de 3 × 3 ("Suavizado"). */
export const boxBlur = (g: Uint8ClampedArray, w: number, h: number) => toBytes(conv3(g, w, h, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9));

/** Promedio ponderado de 3 × 3, más peso al centro ("Ponderado"). */
export const weightedBlur = (g: Uint8ClampedArray, w: number, h: number) =>
	toBytes(conv3(g, w, h, [1, 2, 1, 2, 4, 2, 1, 2, 1], 16));

function gradient(g: ArrayLike<number>, w: number, h: number, kx: number[], ky: number[]) {
	const gx = conv3(g, w, h, kx);
	const gy = conv3(g, w, h, ky);
	const mag = new Float32Array(w * h);
	for (let i = 0; i < mag.length; i++) mag[i] = Math.hypot(gx[i], gy[i]);
	return { gx, gy, mag };
}

export const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
export const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

export const sobel = (g: Uint8ClampedArray, w: number, h: number) => toBytes(gradient(g, w, h, SOBEL_X, SOBEL_Y).mag, 0.5);

export const prewitt = (g: Uint8ClampedArray, w: number, h: number) =>
	toBytes(gradient(g, w, h, [-1, 0, 1, -1, 0, 1, -1, 0, 1], [-1, -1, -1, 0, 0, 0, 1, 1, 1]).mag, 0.7);

/** Cruz de Roberts: diferencias en diagonal sobre una ventana de 2 × 2. */
export function roberts(g: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
	const o = new Uint8ClampedArray(w * h);
	for (let y = 0; y < h - 1; y++) {
		for (let x = 0; x < w - 1; x++) {
			const i = y * w + x;
			const a = g[i] - g[i + w + 1];
			const b = g[i + 1] - g[i + w];
			o[i] = Math.hypot(a, b) * 2;
		}
	}
	return o;
}

const GAUSS5 = [2, 4, 5, 4, 2, 4, 9, 12, 9, 4, 5, 12, 15, 12, 5, 4, 9, 12, 9, 4, 2, 4, 5, 4, 2];

function gauss5(g: Uint8ClampedArray, w: number, h: number): Float32Array {
	const o = new Float32Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let s = 0;
			let k = 0;
			for (let dy = -2; dy <= 2; dy++) {
				const yy = Math.min(h - 1, Math.max(0, y + dy));
				for (let dx = -2; dx <= 2; dx++) {
					const xx = Math.min(w - 1, Math.max(0, x + dx));
					s += GAUSS5[k++] * g[yy * w + xx];
				}
			}
			o[y * w + x] = s / 159;
		}
	}
	return o;
}

/** Canny: suavizado gaussiano, gradiente de Sobel, supresión de no máximos y doble umbral con histéresis. */
export function canny(g: Uint8ClampedArray, w: number, h: number, low = 40, high = 90): Uint8ClampedArray {
	const { gx, gy, mag } = gradient(gauss5(g, w, h), w, h, SOBEL_X, SOBEL_Y);
	const nms = new Float32Array(w * h);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			const m = mag[i];
			if (m < low) continue;
			let a = (Math.atan2(gy[i], gx[i]) * 180) / Math.PI;
			if (a < 0) a += 180;
			let n1: number;
			let n2: number;
			if (a < 22.5 || a >= 157.5) {
				n1 = mag[i - 1];
				n2 = mag[i + 1];
			} else if (a < 67.5) {
				n1 = mag[i - w + 1];
				n2 = mag[i + w - 1];
			} else if (a < 112.5) {
				n1 = mag[i - w];
				n2 = mag[i + w];
			} else {
				n1 = mag[i - w - 1];
				n2 = mag[i + w + 1];
			}
			if (m >= n1 && m >= n2) nms[i] = m;
		}
	}
	const out = new Uint8ClampedArray(w * h);
	const stack: number[] = [];
	for (let i = 0; i < nms.length; i++) {
		if (nms[i] >= high && !out[i]) {
			out[i] = 255;
			stack.push(i);
			while (stack.length) {
				const j = stack.pop()!;
				const x = j % w;
				const y = (j / w) | 0;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const xx = x + dx;
						const yy = y + dy;
						if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
						const k = yy * w + xx;
						if (!out[k] && nms[k] >= low) {
							out[k] = 255;
							stack.push(k);
						}
					}
				}
			}
		}
	}
	return out;
}

/** Aplica un filtro y escribe el resultado en `dst` (RGBA). `tint` pinta los bordes con el rojo del sitio. */
export function applyFilter(
	id: FilterId,
	src: ImageData,
	dst: ImageData,
	opts: { t1: number; low: number; high: number; tint: [number, number, number] | null; bg: [number, number, number] },
) {
	const { width: w, height: h } = src;
	const n = w * h;
	const s = src.data;
	const d = dst.data;
	if (id === 'original') {
		d.set(s);
		return;
	}
	if (id === 'negativo') {
		for (let j = 0; j < n * 4; j += 4) {
			d[j] = 255 - s[j];
			d[j + 1] = 255 - s[j + 1];
			d[j + 2] = 255 - s[j + 2];
			d[j + 3] = 255;
		}
		return;
	}
	const g = toGray(s, n);
	let o: Uint8ClampedArray;
	switch (id) {
		case 'grises':
			o = g;
			break;
		case 'bin1':
			o = threshold(g, opts.t1);
			break;
		case 'bin2':
			o = meanThreshold(g);
			break;
		case 'suavizado':
			o = boxBlur(g, w, h);
			break;
		case 'ponderado':
			o = weightedBlur(g, w, h);
			break;
		case 'sobel':
			o = sobel(g, w, h);
			break;
		case 'prewitt':
			o = prewitt(g, w, h);
			break;
		case 'roberts':
			o = roberts(g, w, h);
			break;
		default:
			o = canny(g, w, h, opts.low, opts.high);
	}
	const edge = FILTERS.find((f) => f.id === id)?.edge && opts.tint;
	for (let i = 0, j = 0; i < n; i++, j += 4) {
		const v = o[i];
		if (edge && opts.tint) {
			const k = v / 255;
			d[j] = opts.bg[0] + (opts.tint[0] - opts.bg[0]) * k;
			d[j + 1] = opts.bg[1] + (opts.tint[1] - opts.bg[1]) * k;
			d[j + 2] = opts.bg[2] + (opts.tint[2] - opts.bg[2]) * k;
		} else {
			d[j] = d[j + 1] = d[j + 2] = v;
		}
		d[j + 3] = 255;
	}
}
