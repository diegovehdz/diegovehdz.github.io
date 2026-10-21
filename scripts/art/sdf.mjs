// Funciones de distancia con signo (SDF) para el raymarcher de scripts/art/render.mjs.
// Los vectores son arreglos [x, y, z] solo al construir la escena; al evaluar se usan números sueltos,
// que es mucho más rápido en JavaScript.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => {
	const l = Math.hypot(a[0], a[1], a[2]) || 1;
	return [a[0] / l, a[1] / l, a[2] / l];
};
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};

/** Rota el vector p alrededor del eje unitario k un ángulo t (fórmula de Rodrigues). */
export function rotate(p, k, t) {
	const c = Math.cos(t);
	const s = Math.sin(t);
	const kxp = cross(k, p);
	const kdp = dot(k, p) * (1 - c);
	return [p[0] * c + kxp[0] * s + k[0] * kdp, p[1] * c + kxp[1] * s + k[1] * kdp, p[2] * c + kxp[2] * s + k[2] * kdp];
}

/** Base ortonormal a partir de un eje principal y una dirección "arriba" aproximada. */
export function basis(forward, upHint) {
	const x = norm(forward);
	const z = norm(sub(upHint, mul(x, dot(upHint, x))));
	const y = cross(z, x);
	return [x, y, z];
}

/** Unión suave (polinomial): mezcla dos superficies en una franja de ancho k. */
export const smin = (a, b, k) => {
	if (k <= 0) return a < b ? a : b;
	const h = Math.max(k - Math.abs(a - b), 0) / k;
	return (a < b ? a : b) - h * h * k * 0.25;
};

// Cada primitiva es { f(x, y, z) → distancia, c: centro, r: radio de una esfera que la contiene }.

export function sphere(c, r) {
	const [cx, cy, cz] = c;
	return { f: (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r, c, r };
}

/** Cono redondeado de a a b con radios r1 y r2 (Íñigo Quílez). */
export function roundCone(a, b, r1, r2) {
	const [ax, ay, az] = a;
	const bax = b[0] - ax;
	const bay = b[1] - ay;
	const baz = b[2] - az;
	const l2 = bax * bax + bay * bay + baz * baz;
	const rr = r1 - r2;
	const a2 = l2 - rr * rr;
	const il2 = 1 / l2;
	const srr = Math.sign(rr) * rr * rr;
	const f = (x, y, z) => {
		const pax = x - ax;
		const pay = y - ay;
		const paz = z - az;
		const py = pax * bax + pay * bay + paz * baz;
		const pz = py - l2;
		const qx = pax * l2 - bax * py;
		const qy = pay * l2 - bay * py;
		const qz = paz * l2 - baz * py;
		const x2 = qx * qx + qy * qy + qz * qz;
		const y2 = py * py * l2;
		const z2 = pz * pz * l2;
		const k = srr * x2;
		if (Math.sign(pz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
		if (Math.sign(py) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
		return (Math.sqrt(x2 * a2 * il2) + py * rr) * il2 - r1;
	};
	return { f, c: mul(add(a, b), 0.5), r: Math.sqrt(l2) / 2 + Math.max(r1, r2) };
}

/** Elipsoide orientado (aproximación de Quílez). axes = [ex, ey, ez] unitarios. */
export function ellipsoid(c, axes, radii) {
	const [cx, cy, cz] = c;
	const [ex, ey, ez] = axes;
	const [rx, ry, rz] = radii;
	const rmin = Math.min(rx, ry, rz);
	const f = (x, y, z) => {
		const dx = x - cx;
		const dy = y - cy;
		const dz = z - cz;
		const lx = dx * ex[0] + dy * ex[1] + dz * ex[2];
		const ly = dx * ey[0] + dy * ey[1] + dz * ey[2];
		const lz = dx * ez[0] + dy * ez[1] + dz * ez[2];
		const k0 = Math.hypot(lx / rx, ly / ry, lz / rz);
		const k1 = Math.hypot(lx / (rx * rx), ly / (ry * ry), lz / (rz * rz));
		if (k1 < 1e-9) return -rmin;
		return (k0 * (k0 - 1)) / k1;
	};
	return { f, c, r: Math.max(rx, ry, rz) };
}

/** Caja redondeada orientada. half = medias medidas (sin el redondeo). */
export function roundBox(c, axes, half, round = 0) {
	const [cx, cy, cz] = c;
	const [ex, ey, ez] = axes;
	const [hx, hy, hz] = half;
	const f = (x, y, z) => {
		const dx = x - cx;
		const dy = y - cy;
		const dz = z - cz;
		const qx = Math.abs(dx * ex[0] + dy * ex[1] + dz * ex[2]) - hx;
		const qy = Math.abs(dx * ey[0] + dy * ey[1] + dz * ey[2]) - hy;
		const qz = Math.abs(dx * ez[0] + dy * ez[1] + dz * ez[2]) - hz;
		const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
		return out + Math.min(Math.max(qx, qy, qz), 0) - round;
	};
	return { f, c, r: Math.hypot(hx, hy, hz) + round };
}

export const AXES = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1],
];

/** Esfera que contiene a todas las primitivas (no es la mínima, pero es barata y correcta). */
export function bounds(prims, margin = 0) {
	const c = [0, 0, 0];
	for (const p of prims) for (let i = 0; i < 3; i++) c[i] += p.c[i] / prims.length;
	let r = 0;
	for (const p of prims) r = Math.max(r, len(sub(p.c, c)) + p.r);
	return { c, r: r + margin };
}

// ruido de valor 3D (para texturas suaves como los mares de la luna)
const hash3 = (x, y, z) => {
	let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
export function noise3(x, y, z) {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const zi = Math.floor(z);
	const fx = x - xi;
	const fy = y - yi;
	const fz = z - zi;
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	const w = fz * fz * (3 - 2 * fz);
	const n = (a, b, c) => hash3(xi + a, yi + b, zi + c);
	const x00 = mix(n(0, 0, 0), n(1, 0, 0), u);
	const x10 = mix(n(0, 1, 0), n(1, 1, 0), u);
	const x01 = mix(n(0, 0, 1), n(1, 0, 1), u);
	const x11 = mix(n(0, 1, 1), n(1, 1, 1), u);
	return mix(mix(x00, x10, v), mix(x01, x11, v), w);
}
export function fbm3(x, y, z, oct = 4) {
	let a = 0.5;
	let s = 0;
	let f = 1;
	for (let i = 0; i < oct; i++) {
		s += a * noise3(x * f, y * f, z * f);
		f *= 2.03;
		a *= 0.5;
	}
	return s;
}
