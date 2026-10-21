// Movimiento del sitio. Todo depende de la clase `.motion` en <html>, que solo se agrega si el visitante no pidió
// reducir el movimiento (ver Base.astro). Sin ella, el sitio se ve completo y estático.
//
// - Títulos: cada línea sube desde abajo al entrar en pantalla (CSS + IntersectionObserver).
// - [data-split]: el texto se parte en letras que suben escalonadas (nombre de portada, palabra del pie).
// - [data-drift]: desplazamiento ligado al scroll ("start|center x|y cantidad").
// - [data-marquee]: marquesinas cuya velocidad y dirección siguen al scroll.
// - [data-rotator]: palabras que rotan. [data-scramble]: texto que se "descifra". [data-count]: números que cuentan.
import { refitMega } from './mega-fit';

const html = document.documentElement;
const enabled = () => html.classList.contains('motion');
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------- dividir texto ----------

function splitChars(root: HTMLElement) {
	if (root.dataset.splitDone) return;
	root.dataset.splitDone = '1';
	let i = 0;
	const walk = (node: Node) => {
		for (const child of [...node.childNodes]) {
			if (child.nodeType === Node.TEXT_NODE) {
				const text = child.textContent ?? '';
				if (!text.trim()) continue;
				const frag = document.createDocumentFragment();
				for (const c of text) {
					const s = document.createElement('span');
					s.className = 'ch';
					s.textContent = c === ' ' ? ' ' : c;
					s.style.setProperty('--i', String(i++));
					frag.append(s);
				}
				child.replaceWith(frag);
			} else if (child.nodeType === Node.ELEMENT_NODE && !(child as Element).classList.contains('ch')) {
				walk(child);
			}
		}
	};
	walk(root);
}

function splitWords(root: HTMLElement) {
	if (root.dataset.splitDone) return;
	root.dataset.splitDone = '1';
	let i = 0;
	const walk = (node: Node) => {
		for (const child of [...node.childNodes]) {
			if (child.nodeType === Node.TEXT_NODE) {
				const parts = (child.textContent ?? '').split(/(\s+)/);
				const frag = document.createDocumentFragment();
				for (const p of parts) {
					if (!p) continue;
					if (/^\s+$/.test(p)) {
						frag.append(document.createTextNode(p));
						continue;
					}
					const s = document.createElement('span');
					s.className = 'w';
					s.textContent = p;
					s.style.setProperty('--i', String(i++));
					frag.append(s);
				}
				child.replaceWith(frag);
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				const el = child as HTMLElement;
				if (el.matches('[data-rotator], .visually-hidden')) {
					el.classList.add('w');
					el.style.setProperty('--i', String(i++));
				} else walk(el);
			}
		}
	};
	walk(root);
}

// ---------- descifrar y contar ----------

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+=';

function scramble(el: HTMLElement, duration = 650) {
	const final = el.dataset.text ?? el.textContent ?? '';
	el.dataset.text = final;
	if (el.dataset.busy) return;
	el.dataset.busy = '1';
	const start = performance.now();
	const step = (now: number) => {
		const t = clamp((now - start) / duration, 0, 1);
		const shown = Math.floor(t * final.length);
		let out = '';
		for (let i = 0; i < final.length; i++) {
			const c = final[i];
			out += i < shown || /[\s—·.,:/-]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
		}
		el.textContent = out;
		if (t < 1) requestAnimationFrame(step);
		else {
			el.textContent = final;
			delete el.dataset.busy;
		}
	};
	requestAnimationFrame(step);
}

function countUp(el: HTMLElement) {
	const target = Number(el.dataset.count);
	if (!Number.isFinite(target)) return;
	const suffix = el.dataset.suffix ?? '';
	const fmt = new Intl.NumberFormat('es-MX');
	const dur = 1200;
	const start = performance.now();
	const step = (now: number) => {
		const t = clamp((now - start) / dur, 0, 1);
		const e = 1 - (1 - t) ** 3;
		el.textContent = fmt.format(Math.round(target * e)) + suffix;
		if (t < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

// ---------- palabras que rotan ----------

function initRotator(el: HTMLElement) {
	const track = el.querySelector<HTMLElement>('.rotator__track');
	if (!track) return;
	const words = [...track.children] as HTMLElement[];
	if (words.length < 2) return;
	const clone = words[0].cloneNode(true) as HTMLElement;
	clone.setAttribute('aria-hidden', 'true');
	track.append(clone);
	const all = [...words, clone];
	let i = 0;
	const size = () => (el.style.width = `${all[i].getBoundingClientRect().width}px`);
	size();
	document.fonts?.ready.then(size);
	window.addEventListener('resize', size);
	setInterval(() => {
		if (document.hidden) return;
		i++;
		track.style.transition = '';
		track.style.transform = `translateY(${(-100 * i) / all.length}%)`;
		size();
		if (i === all.length - 1) {
			setTimeout(() => {
				track.style.transition = 'none';
				track.style.transform = 'translateY(0)';
				i = 0;
				size();
			}, 700);
		}
	}, 2400);
}

// ---------- marquesinas ----------

interface Marquee {
	root: HTMLElement;
	track: HTMLElement;
	width: number;
	x: number;
	base: number;
	dir: number;
	follow: boolean;
	visible: boolean;
	hover: number;
}

function setupMarquee(root: HTMLElement): Marquee | null {
	const track = root.querySelector<HTMLElement>('.marquee__track');
	const group = track?.querySelector<HTMLElement>('.marquee__group');
	if (!track || !group) return null;
	const m: Marquee = {
		root,
		track,
		width: 0,
		x: 0,
		base: Number(root.dataset.speed || 70),
		dir: root.hasAttribute('data-reverse') ? 1 : -1,
		follow: !root.hasAttribute('data-steady'),
		visible: false,
		hover: 0,
	};
	const fill = () => {
		m.width = group.getBoundingClientRect().width;
		if (!m.width) return;
		const need = Math.ceil(root.clientWidth / m.width) + 1;
		while (track.children.length < need + 1) {
			const c = group.cloneNode(true) as HTMLElement;
			c.setAttribute('aria-hidden', 'true');
			c.querySelectorAll('a').forEach((a) => (a.tabIndex = -1));
			track.append(c);
		}
	};
	fill();
	document.fonts?.ready.then(fill);
	new ResizeObserver(fill).observe(root);
	new IntersectionObserver((e) => (m.visible = e[0].isIntersecting)).observe(root);
	root.addEventListener('pointerenter', () => (m.hover = 1));
	root.addEventListener('pointerleave', () => (m.hover = 0));
	root.addEventListener('focusin', () => (m.hover = 1));
	root.addEventListener('focusout', () => (m.hover = 0));
	return m;
}

// ---------- deriva con el scroll ----------

interface Drift {
	el: HTMLElement;
	mode: 'start' | 'center';
	axis: 'x' | 'y';
	amount: number;
}

function parseDrift(el: HTMLElement): Drift | null {
	const [mode, axis, amount] = (el.dataset.drift || '').split(/\s+/);
	const n = Number(amount);
	if (!Number.isFinite(n) || !n) return null;
	return { el, mode: mode === 'start' ? 'start' : 'center', axis: axis === 'y' ? 'y' : 'x', amount: n };
}

// ---------- arranque ----------

let started = false;

export function initMotion() {
	if (started) return;
	started = true;
	(window as unknown as { __motion: boolean }).__motion = true;
	if (!enabled()) return;

	// 1. partir textos
	document.querySelectorAll<HTMLElement>('[data-split]').forEach(splitChars);
	document.querySelectorAll<HTMLElement>('[data-words]').forEach(splitWords);
	refitMega();

	// 2. aparición de bloques de contenido que todavía no se ven
	const vh = window.innerHeight;
	const auto = document.querySelectorAll<HTMLElement>(
		'main .blurb, main .lede, main .entries > li, main .rows > li, main .stats > li, main .facts, main .chips:not(.no-reveal), main .feature__num, main .feature__kicker, main .link-arrow, main .pcard, main .lab-item, main .tl__col',
	);
	const groups = new Map<Element, number>();
	auto.forEach((el) => {
		if (el.classList.contains('reveal')) return;
		const r = el.getBoundingClientRect();
		if (r.top < vh * 0.92 && r.bottom > 0) return; // ya visible: no lo escondemos
		const parent = el.parentElement!;
		const n = groups.get(parent) ?? 0;
		groups.set(parent, n + 1);
		el.style.setProperty('--d', `${Math.min(n, 8) * 70}ms`);
		el.classList.add('reveal');
	});

	// 3. observador para todo lo que se revela al entrar
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				const el = e.target as HTMLElement;
				el.classList.add('is-in');
				if (el.hasAttribute('data-scramble')) scramble(el);
				if (el.hasAttribute('data-count')) countUp(el);
				io.unobserve(el);
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
	);
	document
		.querySelectorAll<HTMLElement>(
			'.title, .reveal, [data-split]:not([data-intro]), [data-words]:not([data-intro]), [data-scramble], [data-count], [data-draw]',
		)
		.forEach((el) => {
			if (el.hasAttribute('data-count')) el.textContent = `0${el.dataset.suffix ?? ''}`;
			io.observe(el);
		});

	// 4. intro de la portada: cuando las fuentes están listas (o a los 900 ms, lo que pase primero)
	const intro = () => document.querySelectorAll<HTMLElement>('[data-intro]').forEach((el) => el.classList.add('is-in'));
	Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 900))]).then(() =>
		requestAnimationFrame(() => requestAnimationFrame(intro)),
	);

	// 5. palabras que rotan
	document.querySelectorAll<HTMLElement>('[data-rotator]').forEach(initRotator);

	// 6. bucle único: marquesinas y deriva
	const marquees = [...document.querySelectorAll<HTMLElement>('[data-marquee]')].map(setupMarquee).filter(Boolean) as Marquee[];
	const drifts = [...document.querySelectorAll<HTMLElement>('[data-drift]')].map(parseDrift).filter(Boolean) as Drift[];

	let lastY = window.scrollY;
	let lastT = performance.now();
	let boost = 0;
	let scrollDir = 1;
	let driftDirty = true;
	window.addEventListener('scroll', () => (driftDirty = true), { passive: true });
	window.addEventListener('resize', () => (driftDirty = true));

	const loop = (now: number) => {
		const dt = Math.min((now - lastT) / 1000, 0.05);
		lastT = now;
		const y = window.scrollY;
		const vel = dt > 0 ? (y - lastY) / dt : 0;
		lastY = y;
		if (Math.abs(vel) > 30) scrollDir = vel > 0 ? 1 : -1;
		boost += (Math.min(Math.abs(vel) * 0.35, 1400) - boost) * 0.08;

		// marquesinas
		for (const m of marquees) {
			if (!m.visible || !m.width || document.hidden) continue;
			const dir = m.follow ? m.dir * scrollDir : m.dir;
			const speed = (m.base + boost) * (m.hover ? 0.18 : 1);
			m.x += dir * speed * dt;
			if (m.x <= -m.width) m.x += m.width;
			if (m.x > 0) m.x -= m.width;
			m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
		}

		// deriva
		if (driftDirty) {
			driftDirty = false;
			const vhNow = window.innerHeight;
			for (const d of drifts) {
				const r = d.el.getBoundingClientRect();
				if (r.bottom < -vhNow || r.top > vhNow * 2) continue;
				const p = d.mode === 'start' ? clamp(y / vhNow, 0, 1.4) : clamp((vhNow - r.top) / (vhNow + r.height), 0, 1) - 0.5;
				const off = p * d.amount;
				d.el.style.transform =
					d.axis === 'x' ? `translate3d(${off.toFixed(3)}vw,0,0)` : `translate3d(0,${off.toFixed(3)}%,0)`;
			}
		}
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
