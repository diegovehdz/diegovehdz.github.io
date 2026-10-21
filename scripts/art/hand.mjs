// Una mano humana hecha con primitivas SDF, con dedos articulados.
// Coordenadas locales de una mano DERECHA: X hacia la punta de los dedos, Y hacia el pulgar, Z hacia el dorso.
// La palma mide 1 de largo (de la muñeca a los nudillos); las proporciones salen de medidas promedio de una mano adulta.
import { add, basis, bounds, clamp, cross, dot, ellipsoid, mix, mul, norm, rotate, roundCone, smin, sphere, sub } from './sdf.mjs';

// articulación metacarpofalángica (nudillo), radio en la base y largo de las tres falanges
const FINGERS = [
	{ base: [0.92, 0.25, 0], r: 0.093, len: [0.43, 0.25, 0.21] }, // índice
	{ base: [0.96, 0.083, 0], r: 0.095, len: [0.48, 0.29, 0.22] }, // medio
	{ base: [0.93, -0.083, 0], r: 0.089, len: [0.45, 0.27, 0.21] }, // anular
	{ base: [0.86, -0.24, 0], r: 0.079, len: [0.35, 0.21, 0.19] }, // meñique
];
const TAPER = [1, 0.93, 0.85, 0.78]; // radio relativo en cada articulación hasta la yema

/** Pose relajada. Ángulos en radianes; la flexión positiva dobla hacia la palma. */
export const RELAXED = {
	fingers: [
		[0.25, 0.35, 0.2],
		[0.3, 0.42, 0.25],
		[0.35, 0.5, 0.28],
		[0.42, 0.55, 0.3],
	],
	spread: [0.07, 0, -0.06, -0.14],
	thumb: { dir: [0.8, 0.42, -0.42], roll: -1.0, flex: [0.35, 0.35] },
	wrist: [0, 0], // flexión hacia la palma, desviación hacia el pulgar
	forearm: 3.2,
	cup: 0.5,
};

function chain(base, dir, up, lens, radii, flex) {
	const prims = [];
	let p = base;
	let d = norm(dir);
	let u = norm(up);
	for (let i = 0; i < lens.length; i++) {
		const axis = norm(cross(u, d));
		d = rotate(d, axis, flex[i] ?? 0);
		u = rotate(u, axis, flex[i] ?? 0);
		const q = add(p, mul(d, lens[i]));
		prims.push(roundCone(p, q, radii[i], radii[i + 1]));
		p = q;
	}
	return prims;
}

const unionOf = (prims) => (x, y, z) => {
	let d = Infinity;
	for (const p of prims) {
		const v = p.f(x, y, z);
		if (v < d) d = v;
	}
	return d;
};

/**
 * Construye una mano. `place`: posición, dirección de los dedos (fwd) y del dorso (up) en el mundo,
 * escala y `mirror` para una mano izquierda.
 */
export function hand(pose = {}, place = {}) {
	const P = { ...RELAXED, ...pose, thumb: { ...RELAXED.thumb, ...(pose.thumb ?? {}) } };
	const { pos = [0, 0, 0], fwd = [1, 0, 0], up = [0, 0, 1], scale = 1, mirror = false } = place;

	// ---- palma: caja redondeada que se angosta hacia la muñeca y se ahueca ligeramente ----
	const cup = P.cup;
	const palm = {
		f: (x, y, z) => {
			const zc = z + cup * y * y;
			const hy = mix(0.19, 0.235, clamp((x - 0.1) / 0.75, 0, 1));
			const qx = Math.abs(x - 0.47) - 0.36;
			const qy = Math.abs(y) - hy;
			const qz = Math.abs(zc) - 0.035;
			const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
			return (out + Math.min(Math.max(qx, qy, qz), 0) - 0.12) * 0.9;
		},
		c: [0.47, 0, 0],
		r: 0.62,
	};
	const zAxis = [0, 0, 1];
	const thenarAxes = basis(rotate([1, 0, 0], zAxis, 0.5), zAxis);
	const thenar = ellipsoid([0.3, 0.19, -0.072], thenarAxes, [0.3, 0.16, 0.12]);
	const hypoAxes = basis(rotate([1, 0, 0], zAxis, -0.08), zAxis);
	const hypothenar = ellipsoid([0.4, -0.235, -0.045], hypoAxes, [0.36, 0.11, 0.105]);
	const knuckles = FINGERS.map((fg) => sphere([fg.base[0] - 0.02, fg.base[1], 0.035], fg.r * 0.95));

	// ---- antebrazo: cono con sección elíptica (más ancho que alto), orientado según la muñeca ----
	const [wFlex, wDev] = P.wrist;
	let aDir = rotate([-1, 0, 0], [0, 1, 0], -wFlex);
	let aUp = rotate([0, 0, 1], [0, 1, 0], -wFlex);
	aDir = rotate(aDir, zAxis, wDev);
	aUp = rotate(aUp, zAxis, wDev);
	const [fa, fv, fw] = basis(aDir, aUp);
	const L = P.forearm;
	const r1 = 0.25;
	const r2 = 0.4;
	const flat = 1.35;
	const cb = (r1 - r2) / L;
	const ca = Math.sqrt(1 - cb * cb);
	const s0 = [0.04, 0, 0];
	const forearm = {
		f: (x, y, z) => {
			const dx = x - s0[0];
			const dy = y - s0[1];
			const dz = z - s0[2];
			const u = dx * fa[0] + dy * fa[1] + dz * fa[2];
			const v = dx * fv[0] + dy * fv[1] + dz * fv[2];
			const w = (dx * fw[0] + dy * fw[1] + dz * fw[2]) * flat;
			const q = Math.hypot(v, w);
			const k = -cb * q + ca * u;
			let d;
			if (k < 0) d = Math.hypot(q, u) - r1;
			else if (k > ca * L) d = Math.hypot(q, u - L) - r2;
			else d = q * ca + u * cb - r1;
			return d / flat;
		},
		c: add(s0, mul(aDir, L / 2)),
		r: L / 2 + r2,
	};

	// ---- dedos ----
	const fingers = FINGERS.map((fg, i) => {
		const dir = rotate([1, 0, 0], zAxis, P.spread[i] ?? 0);
		const radii = TAPER.map((t) => fg.r * t);
		return chain(fg.base, dir, zAxis, fg.len, radii, P.fingers[i]);
	});

	// ---- pulgar: metacarpiano (dentro de la eminencia tenar) + dos falanges ----
	const tDir = norm(P.thumb.dir);
	let tUp = norm(sub(zAxis, mul(tDir, dot(zAxis, tDir))));
	tUp = rotate(tUp, tDir, P.thumb.roll);
	const thumb = chain([0.13, 0.2, -0.06], tDir, tUp, [0.4, 0.3, 0.26], [0.14, 0.115, 0.105, 0.092], [0, ...P.thumb.flex]);

	const all = [palm, thenar, hypothenar, ...knuckles, forearm, ...fingers.flat(), ...thumb];
	const box = bounds(all, 0.08);
	const fingerF = fingers.map(unionOf);
	const thumbF = unionOf(thumb);

	const local = (x, y, z) => {
		let d = palm.f(x, y, z);
		d = smin(d, thenar.f(x, y, z), 0.1);
		d = smin(d, hypothenar.f(x, y, z), 0.08);
		for (const k of knuckles) d = smin(d, k.f(x, y, z), 0.05);
		d = smin(d, forearm.f(x, y, z), 0.16);
		// cada dedo se funde con la palma, pero no con los otros dedos
		let out = smin(d, thumbF(x, y, z), 0.07);
		for (const f of fingerF) {
			const v = smin(d, f(x, y, z), 0.085);
			if (v < out) out = v;
		}
		return out;
	};

	// ---- colocar en el mundo ----
	const [X, Y, Z] = basis(fwd, up);
	const [px, py, pz] = pos;
	const s = scale;
	const sy = mirror ? -1 : 1;
	const wc = add(pos, mul(add(add(mul(X, box.c[0]), mul(Y, box.c[1] * sy)), mul(Z, box.c[2])), s));
	const wr = box.r * s;
	const f = (x, y, z) => {
		const bx = x - wc[0];
		const by = y - wc[1];
		const bz = z - wc[2];
		const db = Math.sqrt(bx * bx + by * by + bz * bz) - wr;
		// lejos: basta la distancia a la esfera que la contiene. Solo si está MUY lejos, porque esa distancia es
		// mucho menor que la real y las sombras suaves la confundirían con un objeto cercano.
		if (db > 1.2) return db;
		const dx = x - px;
		const dy = y - py;
		const dz = z - pz;
		const lx = (dx * X[0] + dy * X[1] + dz * X[2]) / s;
		const ly = ((dx * Y[0] + dy * Y[1] + dz * Y[2]) / s) * sy;
		const lz = (dx * Z[0] + dy * Z[1] + dz * Z[2]) / s;
		return local(lx, ly, lz) * s;
	};
	/** Convierte un punto del mundo a coordenadas locales de la mano (para objetos que sostiene). */
	const toLocal = (x, y, z) => {
		const dx = x - px;
		const dy = y - py;
		const dz = z - pz;
		return [(dx * X[0] + dy * X[1] + dz * X[2]) / s, ((dx * Y[0] + dy * Y[1] + dz * Y[2]) / s) * sy, (dx * Z[0] + dy * Z[1] + dz * Z[2]) / s];
	};
	return { f, c: wc, r: wr, toLocal, scale: s };
}
