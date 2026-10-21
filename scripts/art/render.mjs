// Raymarcher de SDF que genera las imágenes base del sitio: luminancia + alfa en un PNG en escala de grises.
// El tramado (dithering) no se hace aquí: lo hace el navegador al tamaño exacto de pantalla (src/scripts/dither.ts).
//
// Uso:
//   node scripts/art/render.mjs                 → todas las escenas, a public/art/<escena>.png
//   node scripts/art/render.mjs manos-der --scale=0.5 --preview=<carpeta>
//        --scale: tamaño relativo (para iterar rápido) · --preview: además guarda la imagen sombreada
//        y una vista previa tramada, en tema oscuro y claro.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { SCENES } from './scenes.mjs';
import { clamp, cross, dot, norm, sub } from './sdf.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
	const a = args.find((x) => x.startsWith(`--${name}=`));
	return a ? a.slice(name.length + 3) : def;
};
const names = args.filter((a) => !a.startsWith('--'));
const scale = Number(opt('scale', 1));
const outDir = opt('out', 'public/art');
const previewDir = opt('preview', '');
const ss = Number(opt('ss', scale < 1 ? 1 : 2));
const DEBUG = opt('debug', '');

// ---------------------------------------------------------------- trazado de SDF

function sdfTracer(scene) {
	const sdf = scene.sdf;
	const { c: bc, r: br } = scene.bounds;
	const L = scene.light;
	const K = norm(L.key);
	const F = norm(L.fill ?? [0.6, -0.3, 0.5]);
	const maxSteps = scene.maxSteps ?? 220;
	const eps = scene.eps ?? 0.00035;

	const normal = (x, y, z) => {
		const h = 0.0015;
		const a = sdf(x + h, y - h, z - h);
		const b = sdf(x - h, y - h, z + h);
		const c = sdf(x - h, y + h, z - h);
		const d = sdf(x + h, y + h, z + h);
		return norm([a - b - c + d, -a - b + c + d, -a + b - c + d]);
	};

	// sombra suave "mejorada" de Quílez: estima la distancia al borde de la sombra sin bandas
	const shadow = (x, y, z, lx, ly, lz) => {
		const w = L.penumbra ?? 0.09;
		let res = 1;
		let ph = 1e20;
		let t = 0.015;
		for (let i = 0; i < 160 && t < 8; i++) {
			const h = sdf(x + lx * t, y + ly * t, z + lz * t);
			if (h < 0.0004) return 0;
			// la corrección solo vale cuando el rayo se acerca a algo (h < ph); si no, la fórmula clásica
			const yy = h < ph ? (h * h) / (2 * ph) : 0;
			const d = Math.sqrt(h * h - yy * yy);
			res = Math.min(res, d / (w * Math.max(0.0001, t - yy)));
			ph = h;
			t += Math.max(h, 0.004);
		}
		res = clamp(res, 0, 1);
		return res * res * (3 - 2 * res);
	};

	const occlusion = (x, y, z, n) => {
		let occ = 0;
		let sca = 1;
		for (let i = 0; i < 5; i++) {
			const h = 0.01 + (0.16 * i) / 4;
			const d = sdf(x + n[0] * h, y + n[1] * h, z + n[2] * h);
			occ += (h - d) * sca;
			sca *= 0.9;
		}
		return clamp(1 - 2.2 * occ, 0, 1);
	};

	return (ro, rd) => {
		// descarte rápido: el rayo no toca la esfera que contiene la escena
		const oc = sub(ro, bc);
		const b = dot(oc, rd);
		const cc = dot(oc, oc) - br * br;
		const disc = b * b - cc;
		if (disc < 0) return null;
		const sq = Math.sqrt(disc);
		let t = Math.max(-b - sq, 0);
		const tmax = -b + sq;
		let hit = false;
		for (let i = 0; i < maxSteps; i++) {
			const d = sdf(ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t);
			if (d < eps * t) {
				hit = true;
				break;
			}
			t += d * 0.85;
			if (t > tmax) break;
		}
		if (!hit) return null;
		const x = ro[0] + rd[0] * t;
		const y = ro[1] + rd[1] * t;
		const z = ro[2] + rd[2] * t;
		const n = normal(x, y, z);
		const ndl = dot(n, K);
		const diff = Math.max(ndl, 0);
		const wrap = clamp((ndl + 0.4) / 1.4, 0, 1);
		const sh = diff > 0 ? shadow(x + n[0] * 0.01, y + n[1] * 0.01, z + n[2] * 0.01, K[0], K[1], K[2]) : 0;
		const ao = occlusion(x, y, z, n);
		const fill = Math.max(dot(n, F), 0);
		const rim = Math.pow(clamp(1 + dot(n, rd), 0, 1), L.rimPow ?? 3);
		const hv = norm(sub(K, rd));
		const spec = Math.pow(Math.max(dot(n, hv), 0), 28) * sh;
		let v =
			(L.keyI ?? 1.05) * (0.85 * diff * sh + 0.15 * wrap * (0.4 + 0.6 * sh)) +
			(L.fillI ?? 0.16) * fill * ao +
			(L.ambI ?? 0.05) * ao +
			(L.rimI ?? 0.4) * rim * ao +
			(L.specI ?? 0.25) * spec;
		if (scene.tint) v *= scene.tint(x, y, z, n);
		if (DEBUG === 'sombra') return sh;
		if (DEBUG === 'ao') return ao;
		if (DEBUG === 'difusa') return diff;
		return v;
	};
}

// ---------------------------------------------------------------- render

function camera(cam, W, H) {
	const fw = norm(sub(cam.target, cam.pos));
	const rt = norm(cross(fw, cam.up ?? [0, 1, 0]));
	const up = cross(rt, fw);
	const tanf = Math.tan(((cam.fov ?? 30) * Math.PI) / 360);
	const aspect = W / H;
	return (px, py) => {
		const u = ((px / W) * 2 - 1) * tanf * aspect;
		const v = (1 - (py / H) * 2) * tanf;
		return norm([fw[0] + rt[0] * u + up[0] * v, fw[1] + rt[1] * u + up[1] * v, fw[2] + rt[2] * u + up[2] * v]);
	};
}

function render(scene, W, H) {
	const trace = scene.trace ?? sdfTracer(scene);
	const ray = camera(scene.camera, W, H);
	const ro = scene.camera.pos;
	const lum = new Float32Array(W * H);
	const alpha = new Float32Array(W * H);
	const offs = [];
	for (let a = 0; a < ss; a++) for (let b = 0; b < ss; b++) offs.push([(a + 0.5) / ss, (b + 0.5) / ss]);
	const t0 = Date.now();
	for (let j = 0; j < H; j++) {
		for (let i = 0; i < W; i++) {
			// cada muestra devuelve null (fondo), un valor, o [valor, alfa] para bordes que se desvanecen
			let sum = 0;
			let cover = 0;
			for (const [ox, oy] of offs) {
				const r = trace(ro, ray(i + ox, j + oy));
				if (r === null) continue;
				const [v, a] = typeof r === 'number' ? [r, 1] : r;
				sum += v * a;
				cover += a;
			}
			const k = j * W + i;
			alpha[k] = cover / offs.length;
			lum[k] = cover ? sum / cover : 0;
		}
		if (j % Math.max(1, Math.floor(H / 10)) === 0) process.stdout.write('.');
	}
	process.stdout.write(` ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
	return { lum, alpha };
}

// valor guardado: luminancia comprimida (curva suave) y cuantizada a 64 niveles, de sobra para un tramado de 8 × 8
const encode = (v, gamma) => Math.round(Math.pow(clamp(v, 0, 1), 1 / gamma) * 63) * 4 + 2;

async function save(name, scene, W, H, { lum, alpha }) {
	const gamma = scene.gamma ?? 1.5;
	const buf = Buffer.alloc(W * H * 2);
	for (let k = 0; k < W * H; k++) {
		buf[k * 2] = alpha[k] > 0 ? Math.min(255, encode(lum[k] * (scene.exposure ?? 1), gamma)) : 0;
		buf[k * 2 + 1] = Math.round(alpha[k] * 255);
	}
	mkdirSync(outDir, { recursive: true });
	const file = join(outDir, `${name}.png`);
	const info = await sharp(buf, { raw: { width: W, height: H, channels: 2 } })
		.png({ compressionLevel: 9, palette: false })
		.toFile(file);
	console.log(`  ${file} · ${W}×${H} · ${(info.size / 1024).toFixed(0)} KB`);
	if (previewDir) await preview(name, W, H, buf);
}

// vista previa: imagen sombreada y tramado de Bayer 8 × 8 como lo hará el navegador
const BAYER = [
	0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9,
	41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

async function preview(name, W, H, buf) {
	mkdirSync(previewDir, { recursive: true });
	const shaded = Buffer.alloc(W * H);
	for (let k = 0; k < W * H; k++) shaded[k] = Math.round((buf[k * 2] * buf[k * 2 + 1]) / 255);
	await sharp(shaded, { raw: { width: W, height: H, channels: 1 } }).png().toFile(join(previewDir, `${name}-shaded.png`));
	const cell = Math.max(2, Math.round(W / 300));
	const gw = Math.floor(W / cell);
	const gh = Math.floor(H / cell);
	for (const theme of ['dark', 'light']) {
		const out = Buffer.alloc(gw * cell * gh * cell * 3);
		const bg = theme === 'dark' ? [20, 20, 20] : [248, 244, 236];
		const ink = theme === 'dark' ? [232, 231, 231] : [89, 72, 50];
		for (let gy = 0; gy < gh; gy++) {
			for (let gx = 0; gx < gw; gx++) {
				let l = 0;
				let a = 0;
				for (let y = 0; y < cell; y++)
					for (let x = 0; x < cell; x++) {
						const k = (gy * cell + y) * W + gx * cell + x;
						const al = buf[k * 2 + 1] / 255;
						l += (buf[k * 2] / 255) * al;
						a += al;
					}
				l = a ? l / a : 0;
				a /= cell * cell;
				const v = theme === 'dark' ? l * a : (0.1 + 0.9 * (1 - l)) * a;
				const on = v > (BAYER[(gy % 8) * 8 + (gx % 8)] + 0.5) / 64;
				for (let y = 0; y < cell; y++)
					for (let x = 0; x < cell; x++) {
						const dotPx = on && x < cell - 1 && y < cell - 1;
						const c = dotPx ? ink : bg;
						const o = ((gy * cell + y) * gw * cell + gx * cell + x) * 3;
						out[o] = c[0];
						out[o + 1] = c[1];
						out[o + 2] = c[2];
					}
			}
		}
		await sharp(out, { raw: { width: gw * cell, height: gh * cell, channels: 3 } })
			.png()
			.toFile(join(previewDir, `${name}-${theme}.png`));
	}
}

const list = names.length ? names : Object.keys(SCENES).filter((n) => !SCENES[n].test);
for (const name of list) {
	const def = SCENES[name];
	if (!def) {
		console.error(`No existe la escena "${name}". Escenas: ${Object.keys(SCENES).join(', ')}`);
		process.exit(1);
	}
	const scene = def.build();
	const W = Math.round(def.size[0] * scale);
	const H = Math.round(def.size[1] * scale);
	process.stdout.write(`${name} `);
	await save(name, scene, W, H, render(scene, W, H));
}
