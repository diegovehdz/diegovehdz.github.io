// Escenas del raymarcher. Cada una define tamaño, cámara, luz y la función de distancia del mundo.
import { hand } from './hand.mjs';
import { bounds, clamp, cross, dot, fbm3, mix, mul, norm, smoothstep, sub } from './sdf.mjs';

const STATUE = { key: [-0.45, 0.65, 0.6], fill: [0.7, -0.35, 0.4], keyI: 1.05, fillI: 0.14, ambI: 0.05, rimI: 0.45, specI: 0.22 };

function world(prims) {
	const f = (x, y, z) => {
		let d = Infinity;
		for (const p of prims) {
			const v = p.f(x, y, z);
			if (v < d) d = v;
		}
		return d;
	};
	return { sdf: f, bounds: bounds(prims, 0.1) };
}

// vistas para revisar proporciones de la mano
const VIEWS = {
	arriba: { pos: [0.6, 7, 0.01], target: [0.6, 0, 0], up: [0, 0, -1] },
	lado: { pos: [0.6, 0.2, 7], target: [0.6, 0, 0] },
	palma: { pos: [0.6, -7, 0.01], target: [0.6, 0, 0], up: [0, 0, -1] },
	tres: { pos: [3.5, 4, 5], target: [0.6, 0, 0] },
};
const testScenes = Object.fromEntries(
	Object.entries(VIEWS).map(([k, cam]) => [
		`prueba-${k}`,
		{
			test: true,
			size: [700, 500],
			build: () => ({
				...world([hand({}, { pos: [0, 0, 0], fwd: [1, 0, 0], up: [0, 1, 0] })]),
				camera: { fov: 24, ...cam },
				light: { ...STATUE, key: [-0.3, 0.8, 0.5] },
			}),
		},
	]),
);

// La creación de Adán (Miguel Ángel), cada mano en su propia imagen para acomodarlas por separado en la página.
// Adán: mano izquierda, muñeca caída, dedos sueltos. Dios: mano derecha, índice extendido.
const ADAN = {
	fingers: [
		[0.04, 0.2, 0.14],
		[0.3, 0.52, 0.32],
		[0.42, 0.64, 0.38],
		[0.52, 0.74, 0.42],
	],
	spread: [0.08, 0, -0.06, -0.13],
	thumb: { dir: [0.85, 0.36, -0.3], roll: -1.0, flex: [0.35, 0.4] },
	wrist: [0.45, 0],
	forearm: 3.6,
};
const DIOS = {
	fingers: [
		[0.02, 0.06, 0.04],
		[0.6, 0.9, 0.5],
		[0.8, 1.1, 0.6],
		[0.9, 1.2, 0.6],
	],
	spread: [0.1, 0, -0.06, -0.12],
	thumb: { dir: [0.85, 0.32, -0.42], roll: -1.0, flex: [0.15, 0.1] },
	wrist: [-0.05, 0],
	forearm: 3.6,
};
const CREACION = { ...STATUE, key: [-0.6, 0.75, 0.3], keyI: 0.95, fill: [0.45, -0.65, 0.6], fillI: 0.2, ambI: 0.04, rimI: 0.42, rimPow: 2.5, specI: 0.2 };
const adan = () => hand(ADAN, { pos: [0, 0, 0], fwd: [1, -0.32, 0], up: [0.3, 0.85, 0.45], mirror: true });
const dios = () => hand(DIOS, { pos: [0, 0, 0], fwd: [-1, -0.06, 0], up: [0, 0.55, 0.85] });

// Una mano que se estira hacia una luna (como en las referencias de Diego), para el marco vertical de la portada.
const ALCANZAR = {
	fingers: [
		[0.04, 0.1, 0.05],
		[0.03, 0.08, 0.04],
		[0.07, 0.12, 0.06],
		[0.12, 0.18, 0.08],
	],
	spread: [0.2, 0.04, -0.12, -0.28],
	thumb: { dir: [0.6, 0.72, -0.32], roll: -1.0, flex: [0.12, 0.12] },
	wrist: [-0.25, 0.08],
	forearm: 4,
};
const LUNA = { c: [-0.6, 2.62, -0.4], r: 0.72 };
function luna() {
	const [cx, cy, cz] = LUNA.c;
	return { f: (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - LUNA.r, c: LUNA.c, r: LUNA.r };
}
// mares lunares: manchas suaves de ruido sobre la esfera
function lunaTint(x, y, z) {
	const [cx, cy, cz] = LUNA.c;
	if (Math.hypot(x - cx, y - cy, z - cz) > LUNA.r + 0.02) return 1;
	const n = fbm3(x * 2.2 + 7, y * 2.2, z * 2.2);
	return 1 - 0.55 * smoothstep(0.48, 0.62, n);
}

// Columnata dórica para el marco de "Educación": fustes con estrías y éntasis, equino, ábaco, arquitrabe y gradas.
function columnata() {
	const S = 1.55; // separación entre columnas
	const N = 4;
	const H = 4.2; // altura del fuste
	const flutes = 20;
	const f = (x, y, z) => {
		// gradas (estilóbato)
		let d = Infinity;
		for (let k = 0; k < 3; k++) {
			const hx = (N - 1) * S * 0.5 + 0.9 + (2 - k) * 0.28;
			const hz = 1.0 + (2 - k) * 0.28;
			const cy = -0.15 - k * 0.3;
			const qx = Math.abs(x - ((N - 1) * S) / 2) - hx;
			const qy = Math.abs(y - cy) - 0.15;
			const qz = Math.abs(z) - hz;
			d = Math.min(d, Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0));
		}
		// columnas por repetición de dominio
		const id = clamp(Math.round(x / S), 0, N - 1);
		const lx = x - id * S;
		const r = mix(0.36, 0.29, clamp(y / H, 0, 1)) - 0.035 * Math.sin(clamp(y / H, 0, 1) * Math.PI) * -1;
		const a = Math.atan2(z, lx);
		const rf = r - 0.028 * (0.5 + 0.5 * Math.cos(flutes * a));
		const shaft = Math.max(Math.hypot(lx, z) - rf, Math.max(-y, y - H)) * 0.72;
		// equino (cono redondeado) y ábaco
		const t = clamp((y - H) / 0.24, 0, 1);
		const echinus = Math.max(Math.hypot(lx, z) - mix(0.3, 0.46, Math.sqrt(t)), Math.max(H - y, y - (H + 0.24))) * 0.8;
		const ax = Math.abs(lx) - 0.5;
		const ay = Math.abs(y - (H + 0.31)) - 0.07;
		const az = Math.abs(z) - 0.5;
		const abacus = Math.hypot(Math.max(ax, 0), Math.max(ay, 0), Math.max(az, 0)) + Math.min(Math.max(ax, ay, az), 0);
		d = Math.min(d, shaft, echinus, abacus);
		// arquitrabe y friso
		const bx = Math.abs(x - ((N - 1) * S) / 2) - ((N - 1) * S) / 2 - 0.55;
		const by = Math.abs(y - (H + 0.66)) - 0.28;
		const bz = Math.abs(z) - 0.52;
		const beam = Math.hypot(Math.max(bx, 0), Math.max(by, 0), Math.max(bz, 0)) + Math.min(Math.max(bx, by, bz), 0);
		const fx = bx + 0.02;
		const fy = Math.abs(y - (H + 1.22)) - 0.26;
		const fz = Math.abs(z) - 0.46;
		const frieze = Math.hypot(Math.max(fx, 0), Math.max(fy, 0), Math.max(fz, 0)) + Math.min(Math.max(fx, fy, fz), 0);
		return Math.min(d, beam, frieze);
	};
	const c = [((N - 1) * S) / 2, 2.4, 0];
	return { f, c, r: 5.6 };
}

// Los volcanes vistos desde la Ciudad de México: el Iztaccíhuatl ("la mujer dormida": cabeza, pecho, rodillas y pies)
// y el cono del Popocatépetl con su cráter. Es un campo de alturas, trazado con su propio marcher.
function volcanes() {
	const bump = (x, z, cx, cz, h, wx, wz) => h * Math.exp(-(((x - cx) / wx) ** 2) - ((z - cz) / wz) ** 2);
	// cañadas: ruido "afilado" (1 - |ruido|) que dibuja crestas y barrancas en las laderas
	const ridged = (x, z) => {
		let s = 0;
		let a = 0.5;
		let f = 1;
		for (let i = 0; i < 4; i++) {
			const n = 1 - Math.abs(fbm3(x * f, 3.7, z * f, 1) * 2 - 1);
			s += a * n * n;
			f *= 2.1;
			a *= 0.5;
		}
		return s;
	};
	const shape = (x, z) => {
		const dp = Math.hypot(x - 3.1, (z + 17) * 0.92);
		let popo = dp < 5.2 ? 3.05 * Math.pow(1 - dp / 5.2, 1.45) : 0;
		if (dp < 0.38) popo -= 0.22 * (1 - (dp / 0.38) ** 2);
		const ridge = 1.65 * Math.exp(-(((x + 3.1) / 3.1) ** 4) - ((z + 19) / 2.3) ** 2);
		const izta =
			ridge +
			bump(x, z, -5.35, -19.2, 0.55, 0.62, 1.2) +
			bump(x, z, -3.55, -19, 0.85, 0.95, 1.4) +
			bump(x, z, -1.85, -18.8, 0.62, 0.75, 1.3) +
			bump(x, z, -0.65, -18.5, 0.22, 0.55, 1.1);
		const far = smoothstep(-9, -17, z);
		const hills = (0.6 * fbm3(x * 0.3, 0, z * 0.3) - 0.1) * far + 0.2 * far;
		return Math.max(popo, izta, hills);
	};
	const height = (x, z) => {
		const m = shape(x, z);
		return m + (m > 0.3 ? 0.3 * ridged(x * 1.1, z * 1.1) * smoothstep(0.3, 1.4, m) : 0) + 0.03 * fbm3(x * 1.7, 1, z * 1.7);
	};
	const L = norm([0.8, 0.38, 0.32]);
	const trace = (ro, rd) => {
		let t = 0.2;
		let prevT = t;
		let hit = false;
		for (let i = 0; i < 800 && t < 70; i++) {
			const x = ro[0] + rd[0] * t;
			const y = ro[1] + rd[1] * t;
			const z = ro[2] + rd[2] * t;
			const dh = y - height(x, z);
			if (dh < 0.0015 * t) {
				hit = true;
				break;
			}
			prevT = t;
			t += Math.max(0.008, dh * 0.4);
		}
		if (!hit) return null;
		let a = prevT;
		let b = t;
		for (let i = 0; i < 8; i++) {
			const m = (a + b) / 2;
			if (ro[1] + rd[1] * m - height(ro[0] + rd[0] * m, ro[2] + rd[2] * m) < 0) b = m;
			else a = m;
		}
		t = b;
		const x = ro[0] + rd[0] * t;
		const z = ro[2] + rd[2] * t;
		const e = 0.015;
		const n = norm([height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)]);
		const h = height(x, z);
		const diff = Math.max(dot(n, L), 0);
		const snow = smoothstep(1.7, 2.15, h + 0.3 * fbm3(x * 3, 5, z * 3)) * smoothstep(0.3, 0.7, n[1]);
		const albedo = mix(0.5, 1.0, snow);
		let v = albedo * (0.1 + 0.95 * diff) + 0.04;
		v = mix(v, 0.35, (1 - Math.exp(-0.025 * t)) * 0.6);
		// la base de las montañas se disuelve en la bruma del valle: el primer plano queda vacío
		const alpha = smoothstep(0.08, 0.75, h);
		return alpha > 0.003 ? [v, alpha] : null;
	};
	return { trace };
}

// Un puño que sostiene una espada en alto (Arcane Codex). La espada se modela en coordenadas de la mano:
// el mango atraviesa el puño a lo largo del eje Y local (hacia el pulgar), y la hoja sigue hacia arriba.
const PUNO = {
	fingers: [
		[1.32, 1.55, 0.85],
		[1.38, 1.6, 0.9],
		[1.42, 1.6, 0.9],
		[1.48, 1.58, 0.9],
	],
	spread: [0.02, 0, -0.02, -0.05],
	thumb: { dir: [0.62, 0.3, -0.72], roll: -1.25, flex: [0.55, 0.45] },
	wrist: [0, 0],
	forearm: 4,
};
const GRIP = [0.86, -0.29]; // eje del mango en (x, z) locales
function espada(h) {
	const [gx0, gz0] = GRIP;
	const local = (x, y, z) => {
		const gx = x - gx0;
		const gz = z - gz0;
		const grip = Math.max(Math.hypot(gx, gz) - 0.135, Math.abs(y - 0.02) - 0.52);
		const pommel = Math.hypot(gx, y + 0.62, gz) - 0.16;
		// guarda: caja redondeada a lo ancho de la hoja
		const qx = Math.abs(gx) - 0.6;
		const qy = Math.abs(y - 0.63) - 0.05;
		const qz = Math.abs(gz) - 0.08;
		const guard = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 0.035;
		// hoja: sección de rombo que se afila en la punta
		const y0 = 0.66;
		const y1 = 4.6;
		const taper = clamp((y1 - y) / 0.7, 0.02, 1);
		const w = 0.15 * taper;
		const t = 0.034 * Math.max(taper, 0.35);
		const rh = (Math.abs(gx) / w + Math.abs(gz) / t - 1) * ((w * t) / Math.hypot(w, t));
		const blade = Math.max(rh, y0 - y, y - y1) * 0.75;
		return Math.min(grip, pommel, guard, blade);
	};
	const f = (x, y, z) => {
		const [lx, ly, lz] = h.toLocal(x, y, z);
		return local(lx, ly, lz) * h.scale;
	};
	return { f, c: h.c, r: h.r + 4.5 };
}
// hoja (B) hacia arriba a la derecha; eje de la palma (A) perpendicular; el antebrazo sale hacia abajo
const B = norm([0.6, 0.8, 0.04]);
const A = norm(sub([-0.62, 0.55, 0.56], mul(B, dot([-0.62, 0.55, 0.56], B))));
const puno = () => hand(PUNO, { pos: [0, 0, 0], fwd: A, up: cross(A, B) });

export const SCENES = {
	...testScenes,
	espada: {
		size: [1000, 625],
		build: () => {
			const h = puno();
			const sw = espada(h);
			const blade = (x, y, z) => {
				const [, ly] = h.toLocal(x, y, z);
				return ly > 0.66 ? 1.35 : 1;
			};
			return {
				...world([h, sw]),
				camera: { pos: [-0.5, 1.2, 13], target: [-0.2, 1.45, 0], fov: 23 },
				light: { ...STATUE, key: [-0.55, 0.7, 0.45], keyI: 0.95, fill: [0.6, -0.4, 0.5], fillI: 0.2, rimI: 0.45, specI: 0.45 },
				tint: blade,
				gamma: 1.1,
			};
		},
	},
	volcanes: {
		size: [960, 540],
		build: () => ({
			...volcanes(),
			camera: { pos: [0, 1.0, 6], target: [-0.6, 1.55, -16], fov: 15 },
			gamma: 1.1,
		}),
	},
	columnas: {
		size: [640, 800],
		build: () => {
			const col = columnata();
			return {
				sdf: col.f,
				bounds: { c: col.c, r: col.r },
				camera: { pos: [-3.2, 0.6, 7.5], target: [2.2, 2.5, -0.4], fov: 44 },
				light: { ...STATUE, key: [-0.75, 0.55, 0.45], keyI: 1.0, fill: [0.5, 0.2, 0.8], fillI: 0.12, rimI: 0.25, specI: 0.06, penumbra: 0.05 },
				gamma: 1.1,
			};
		},
	},
	alcanzar: {
		size: [750, 900],
		build: () => ({
			...world([hand(ALCANZAR, { pos: [0.35, -0.65, 0], fwd: [-0.3, 1, 0.1], up: [0.15, 0.08, -1] }), luna()]),
			camera: { pos: [0, 1.2, 12], target: [-0.05, 1.2, 0], fov: 22 },
			light: { ...STATUE, key: [0.6, 0.7, 0.4], keyI: 0.95, fill: [-0.6, -0.3, 0.5], fillI: 0.18, rimI: 0.4, specI: 0.08 },
			tint: lunaTint,
			gamma: 1.15,
		}),
	},
	'mano-izq': {
		size: [1000, 500],
		build: () => ({ ...world([adan()]), camera: { pos: [-0.5, 0.1, 14], target: [-0.5, -0.1, 0], fov: 10 }, light: CREACION, gamma: 1.15 }),
	},
	'mano-der': {
		size: [1000, 500],
		build: () => ({ ...world([dios()]), camera: { pos: [0.4, 0.1, 14], target: [0.4, -0.1, 0], fov: 10 }, light: CREACION, gamma: 1.15 }),
	},
};
