// Tramado (dithering) y arte ASCII: convertir una imagen en escala de grises en puntos o caracteres.
// Lo usan las imágenes del sitio (src/scripts/dither-art.ts) y el laboratorio de tramado (/lab/tramado/).

/** Matriz de Bayer n × n (n potencia de 2), como umbrales normalizados en (0, 1). */
export function bayer(n: 2 | 4 | 8): Float32Array {
	let m = [0];
	let size = 1;
	while (size < n) {
		const next = new Array(size * 2 * size * 2);
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const v = m[y * size + x] * 4;
				next[y * 2 * size + x] = v;
				next[y * 2 * size + x + size] = v + 2;
				next[(y + size) * 2 * size + x] = v + 3;
				next[(y + size) * 2 * size + x + size] = v + 1;
			}
		m = next;
		size *= 2;
	}
	return Float32Array.from(m, (v) => (v + 0.5) / (n * n));
}

export interface Tone {
	/** >1 aclara los medios tonos, <1 los oscurece */
	gamma?: number;
	/** 1 = sin cambio; >1 separa luces y sombras */
	contrast?: number;
	/** se suma después del contraste (-1 … 1) */
	brightness?: number;
	invert?: boolean;
}

/** Curva de tono aplicada a un valor en [0, 1]. */
export function tone(v: number, t: Tone = {}): number {
	let x = t.invert ? 1 - v : v;
	if (t.gamma && t.gamma !== 1) x = Math.pow(x, 1 / t.gamma);
	if (t.contrast && t.contrast !== 1) x = (x - 0.5) * t.contrast + 0.5;
	if (t.brightness) x += t.brightness;
	return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Luminancia perceptual (Rec. 709) de un píxel RGB en [0, 255]. */
export const luma = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Tramado ordenado: 1 donde hay punto. `bias` (≥ 0) sube el umbral; sirve para animar la aparición. */
export function ordered(values: Float32Array, w: number, h: number, n: 2 | 4 | 8, out = new Uint8Array(w * h), bias?: Float32Array) {
	const m = bayer(n);
	for (let y = 0; y < h; y++) {
		const row = (y % n) * n;
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			out[i] = values[i] > m[row + (x % n)] + (bias ? bias[i] : 0) ? 1 : 0;
		}
	}
	return out;
}

// núcleos de difusión de error: [dx, dy, peso]
const KERNELS = {
	floyd: { div: 16, k: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
	atkinson: { div: 8, k: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
} as const;

export type Diffusion = keyof typeof KERNELS;

/** Difusión de error (Floyd–Steinberg o Atkinson), recorriendo en serpentina para evitar vetas. */
export function diffuse(values: Float32Array, w: number, h: number, kind: Diffusion, out = new Uint8Array(w * h)) {
	const buf = Float32Array.from(values);
	const { div, k } = KERNELS[kind];
	for (let y = 0; y < h; y++) {
		const ltr = y % 2 === 0;
		for (let s = 0; s < w; s++) {
			const x = ltr ? s : w - 1 - s;
			const i = y * w + x;
			const old = buf[i];
			const on = old > 0.5 ? 1 : 0;
			out[i] = on;
			const err = (old - on) / div;
			for (const [dx, dy, wt] of k) {
				const xx = x + (ltr ? dx : -dx);
				const yy = y + dy;
				if (xx >= 0 && xx < w && yy < h) buf[yy * w + xx] += err * wt;
			}
		}
	}
	return out;
}

/** Rampas de caracteres, de vacío a lleno. */
export const RAMPS = {
	clasica: ' .:-=+*#%@',
	fina: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
	bloques: ' ░▒▓█',
	numeros: ' .:;7?JY5PGB#&@',
} as const;

export type Ramp = keyof typeof RAMPS;

/** Índice de carácter para un valor en [0, 1]; `noise` (umbral de Bayer centrado) reparte los saltos entre niveles. */
export const rampIndex = (v: number, len: number, noise = 0) => {
	const i = Math.floor((v + noise / (len - 1)) * (len - 1) + 0.5);
	return i < 0 ? 0 : i >= len ? len - 1 : i;
};
