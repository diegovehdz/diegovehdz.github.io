// Imágenes tramadas del sitio. Cada [data-dither] carga una imagen base (luminancia + alfa, generada por
// scripts/art/render.mjs) y la dibuja como puntos (tramado de Bayer 8 × 8) o caracteres ASCII en un <canvas>,
// al tamaño exacto de pantalla y con el color de texto del tema. Al entrar en pantalla, la imagen "se revela":
// los puntos aparecen en el orden de la matriz de Bayer, o como un frente que avanza en una dirección.
import { bayer, luma, rampIndex, RAMPS, type Ramp, tone } from '../lib/dither';

type Reveal = 'fade' | 'left' | 'right' | 'up' | 'down' | 'none';

const BAYER = bayer(8);
const motion = () => document.documentElement.classList.contains('motion');
const isLight = () => document.documentElement.dataset.theme === 'light';
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function parseColor(css: string): [number, number, number] {
	const m = css.match(/[\d.]+/g);
	return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [232, 231, 231];
}

class DitherArt {
	el: HTMLElement;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	img: HTMLImageElement | null = null;
	opts: {
		src: string;
		cell: number;
		fit: 'contain' | 'cover';
		px: number;
		py: number;
		reveal: Reveal;
		delay: number;
		duration: number;
		gamma: number;
		contrast: number;
		light: 'invert' | 'same';
		mode: 'dots' | 'ascii';
		dot: 'square' | 'round';
		ramp: Ramp;
	};
	gw = 0;
	gh = 0;
	cw = 0; // px de dispositivo por celda (ancho)
	ch = 0; // (alto; en ASCII es mayor)
	lum = new Float32Array(0);
	alpha = new Float32Array(0);
	values = new Float32Array(0);
	order = new Float32Array(0);
	small = document.createElement('canvas');
	atlas: HTMLCanvasElement | null = null;
	color: [number, number, number] = [232, 231, 231];
	progress = 0;
	revealed = false;
	anim = 0;

	constructor(el: HTMLElement) {
		this.el = el;
		this.canvas = el.querySelector('canvas') ?? el.appendChild(document.createElement('canvas'));
		this.ctx = this.canvas.getContext('2d')!;
		const d = el.dataset;
		const [px = '50%', py = '50%'] = (d.position ?? '50% 50%').split(/\s+/);
		this.opts = {
			src: d.dither!,
			cell: Number(d.cell ?? 3),
			fit: d.fit === 'cover' ? 'cover' : 'contain',
			px: parseFloat(px) / 100,
			py: parseFloat(py) / 100,
			reveal: (d.reveal as Reveal) ?? 'fade',
			delay: Number(d.delay ?? 0),
			duration: Number(d.duration ?? 1600),
			gamma: Number(d.gamma ?? 1),
			contrast: Number(d.contrast ?? 1),
			light: d.light === 'same' ? 'same' : 'invert',
			mode: d.mode === 'ascii' ? 'ascii' : 'dots',
			dot: d.dot === 'round' ? 'round' : 'square',
			ramp: (d.ramp as Ramp) in RAMPS ? (d.ramp as Ramp) : 'clasica',
		};
		this.progress = motion() && this.opts.reveal !== 'none' ? 0 : 1;
	}

	load() {
		if (this.img) return;
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => {
			this.img = img;
			this.layout();
		};
		img.src = this.opts.src;
	}

	/** Recalcula la cuadrícula para el tamaño actual y vuelve a muestrear la imagen. */
	layout() {
		const img = this.img;
		const w = this.el.clientWidth;
		const h = this.el.clientHeight;
		if (!img || !w || !h) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		const { mode } = this.opts;
		// la variable CSS --cell (si existe) manda sobre data-cell: permite puntos más finos en pantallas chicas
		const cell = parseFloat(getComputedStyle(this.el).getPropertyValue('--cell')) || this.opts.cell;
		if (mode === 'ascii') {
			this.cw = Math.max(4, Math.round(cell * dpr));
			this.ch = Math.round((this.cw / 0.6) * 1.18);
		} else {
			this.cw = this.ch = Math.max(2, Math.round(cell * dpr));
		}
		const gw = Math.ceil((w * dpr) / this.cw);
		const gh = Math.ceil((h * dpr) / this.ch);
		this.gw = gw;
		this.gh = gh;
		this.canvas.width = gw * this.cw;
		this.canvas.height = gh * this.ch;
		this.canvas.style.width = `${this.canvas.width / dpr}px`;
		this.canvas.style.height = `${this.canvas.height / dpr}px`;

		// muestreo: la imagen se encaja (contain/cover) en la cuadrícula, con suavizado de alta calidad
		const samp = document.createElement('canvas');
		samp.width = gw;
		samp.height = gh;
		const sctx = samp.getContext('2d', { willReadFrequently: true })!;
		sctx.imageSmoothingQuality = 'high';
		// en ASCII cada celda es más alta que ancha: se compensa al encajar
		const cellAspect = this.ch / this.cw;
		const iw = img.naturalWidth;
		const ih = img.naturalHeight / cellAspect;
		const s = this.opts.fit === 'cover' ? Math.max(gw / iw, gh / ih) : Math.min(gw / iw, gh / ih);
		const dw = iw * s;
		const dh = ih * s;
		sctx.drawImage(img, (gw - dw) * this.opts.px, (gh - dh) * this.opts.py, dw, dh);
		const data = sctx.getImageData(0, 0, gw, gh).data;
		const n = gw * gh;
		this.lum = new Float32Array(n);
		this.alpha = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			this.lum[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
			this.alpha[i] = data[i * 4 + 3] / 255;
		}
		this.order = new Float32Array(n);
		const r = this.opts.reveal;
		for (let y = 0; y < gh; y++)
			for (let x = 0; x < gw; x++) {
				const u = x / Math.max(1, gw - 1);
				const v = y / Math.max(1, gh - 1);
				this.order[y * gw + x] = r === 'left' ? 1 - u : r === 'right' ? u : r === 'up' ? 1 - v : r === 'down' ? v : 0;
			}
		this.small.width = gw;
		this.small.height = gh;
		this.recolor();
	}

	/** Color y mapeo según el tema (en el tema claro, la imagen se invierte para que la sombra sea tinta). */
	recolor() {
		if (!this.gw) return;
		this.color = parseColor(getComputedStyle(this.el).color);
		const invert = isLight() && this.opts.light === 'invert';
		const t = { gamma: this.opts.gamma, contrast: this.opts.contrast };
		const n = this.gw * this.gh;
		this.values = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const a = this.alpha[i];
			if (a <= 0.002) continue;
			const l = tone(this.lum[i], t);
			// un mínimo de densidad dentro de la silueta, para que la forma se lea aunque esté en sombra
			this.values[i] = (invert ? 0.08 + 0.92 * (1 - l) : 0.07 + 0.93 * l) * a;
		}
		this.atlas = null;
		this.draw();
	}

	/** Sesgo de la animación por celda: 0 = visible, ≥ 1 = todavía oculto. */
	bias(i: number, p: number) {
		if (p >= 1) return 0;
		if (this.opts.reveal === 'fade') return 1 - p;
		const soft = 0.35;
		const local = (p * (1 + soft) - this.order[i]) / soft;
		return local >= 1 ? 0 : local <= 0 ? 1.01 : 1 - local;
	}

	draw() {
		if (!this.gw) return;
		const p = ease(Math.min(1, Math.max(0, this.progress)));
		if (this.opts.mode === 'ascii') this.paintAscii(p);
		else this.paintDots(p);
	}

	paintDots(p: number) {
		const { gw, gh, cw, ctx } = this;
		const vals = this.values;
		const sctx = this.small.getContext('2d')!;
		const im = sctx.createImageData(gw, gh);
		const [cr, cg, cb] = this.color;
		for (let y = 0; y < gh; y++) {
			const row = (y % 8) * 8;
			for (let x = 0; x < gw; x++) {
				const i = y * gw + x;
				if (vals[i] <= BAYER[row + (x % 8)] + this.bias(i, p)) continue;
				im.data[i * 4] = cr;
				im.data[i * 4 + 1] = cg;
				im.data[i * 4 + 2] = cb;
				im.data[i * 4 + 3] = 255;
			}
		}
		sctx.putImageData(im, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(this.small, 0, 0, gw * cw, gh * cw);
		// cada celda se recorta a un punto con separación, como en una impresión de matriz
		const gap = cw >= 4 ? Math.round(cw * 0.3) : cw >= 3 ? 1 : 0;
		if (!gap && this.opts.dot === 'square') return;
		const tile = document.createElement('canvas');
		tile.width = tile.height = cw;
		const tctx = tile.getContext('2d')!;
		tctx.fillStyle = '#000';
		if (this.opts.dot === 'round') {
			tctx.beginPath();
			tctx.arc(cw / 2, cw / 2, (cw - gap) / 2 + 0.25, 0, Math.PI * 2);
			tctx.fill();
		} else tctx.fillRect(0, 0, cw - gap, cw - gap);
		ctx.globalCompositeOperation = 'destination-in';
		ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.globalCompositeOperation = 'source-over';
	}

	paintAscii(p: number) {
		const { gw, gh, cw, ch, ctx } = this;
		const ramp = RAMPS[this.opts.ramp];
		if (!this.atlas) {
			// atlas con cada carácter de la rampa, dibujado una vez en el color del tema
			const a = document.createElement('canvas');
			a.width = cw * ramp.length;
			a.height = ch;
			const actx = a.getContext('2d')!;
			actx.fillStyle = `rgb(${this.color.join(',')})`;
			actx.font = `500 ${Math.round(cw / 0.6)}px "JetBrains Mono Variable", ui-monospace, monospace`;
			actx.textBaseline = 'middle';
			actx.textAlign = 'center';
			for (let k = 0; k < ramp.length; k++) actx.fillText(ramp[k], k * cw + cw / 2, ch / 2);
			this.atlas = a;
		}
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const vals = this.values;
		for (let y = 0; y < gh; y++) {
			for (let x = 0; x < gw; x++) {
				const i = y * gw + x;
				// durante la aparición, cada carácter "crece" de los más ligeros a los más densos
				const v = vals[i] - this.bias(i, p);
				if (v <= 0.02) continue;
				const k = rampIndex(v, ramp.length, (BAYER[(y % 8) * 8 + (x % 8)] - 0.5) * 0.9);
				if (k > 0) ctx.drawImage(this.atlas, k * cw, 0, cw, ch, x * cw, y * ch, cw, ch);
			}
		}
	}

	play() {
		if (this.revealed) return;
		this.revealed = true;
		if (this.progress >= 1) return this.draw();
		const start = performance.now() + this.opts.delay;
		const step = (now: number) => {
			this.progress = Math.max(0, (now - start) / this.opts.duration);
			this.draw();
			if (this.progress < 1) this.anim = requestAnimationFrame(step);
		};
		this.anim = requestAnimationFrame(step);
	}
}

let started = false;

export function initDither() {
	if (started) return;
	started = true;
	const arts = [...document.querySelectorAll<HTMLElement>('[data-dither]')].map((el) => new DitherArt(el));
	if (!arts.length) return;
	const byEl = new Map(arts.map((a) => [a.el, a]));

	// cargar cuando está cerca de la pantalla; revelar cuando ya se ve una parte
	const near = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				byEl.get(e.target as HTMLElement)?.load();
				near.unobserve(e.target);
			}
		},
		{ rootMargin: '600px 0px' },
	);
	const seen = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				const art = byEl.get(e.target as HTMLElement);
				if (!art) continue;
				const go = () => (art.img ? art.play() : setTimeout(go, 80));
				go();
				seen.unobserve(e.target);
			}
		},
		{ threshold: 0.15 },
	);
	const resize = new ResizeObserver((entries) => {
		for (const e of entries) {
			const art = byEl.get(e.target as HTMLElement);
			if (art?.img) requestAnimationFrame(() => art.layout());
		}
	});
	for (const a of arts) {
		near.observe(a.el);
		seen.observe(a.el);
		resize.observe(a.el);
	}
	window.addEventListener('themechange', () => arts.forEach((a) => a.recolor()));
}
