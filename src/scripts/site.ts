// Comportamiento global: tema, reloj de la CDMX, menú móvil, encabezado, movimiento y la píldora de cafés.
import { cdmxNow, openStatus, parseHours } from '../lib/opening-hours';
import { initMotion } from './motion';

type Theme = 'dark' | 'light';
const THEME_COLORS: Record<Theme, string> = { dark: '#141414', light: '#f8f4ec' };

function currentTheme(): Theme {
	return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
	document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
		btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
	});
	try {
		localStorage.setItem('theme', theme);
	} catch {
		/* almacenamiento no disponible */
	}
	window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

function initTheme() {
	applyTheme(currentTheme());
	document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
		btn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
	});
}

function initClock() {
	const nodes = document.querySelectorAll<HTMLElement>('[data-clock]');
	if (!nodes.length) return;
	const fmt = new Intl.DateTimeFormat('es-MX', {
		timeZone: 'America/Mexico_City',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	});
	const tick = () => {
		const text = `CDMX ${fmt.format(new Date())}`;
		nodes.forEach((n) => (n.textContent = text));
	};
	tick();
	setInterval(tick, 15_000);
}

function initMenu() {
	const menu = document.querySelector<HTMLElement>('[data-menu]');
	const open = document.querySelector<HTMLButtonElement>('[data-menu-open]');
	const close = document.querySelector<HTMLButtonElement>('[data-menu-close]');
	if (!menu || !open || !close) return;
	const setOpen = (value: boolean) => {
		menu.hidden = !value;
		open.setAttribute('aria-expanded', String(value));
		document.body.classList.toggle('menu-open', value);
		if (value) close.focus();
		else open.focus();
	};
	open.addEventListener('click', () => setOpen(true));
	close.addEventListener('click', () => setOpen(false));
	menu.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') setOpen(false);
	});
	menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

function initHeader() {
	const header = document.querySelector<HTMLElement>('[data-header]');
	if (!header) return;
	const onScroll = () => header.toggleAttribute('data-scrolled', window.scrollY > 8);
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
}

// "Lado B": cuántas cafeterías del mapa están abiertas ahora, calculado en el navegador con la hora de la CDMX.
function initCafePill() {
	const pill = document.querySelector<HTMLElement>('[data-cafe-pill]');
	const count = pill?.querySelector<HTMLElement>('[data-cafe-count]');
	if (!pill || !count) return;
	const load = async () => {
		try {
			const res = await fetch('/data/cafes-horarios.json');
			const data = (await res.json()) as { total: number; horarios: [string, string][] };
			const weeks = data.horarios.map(([, h]) => parseHours(h));
			const update = () => {
				const now = cdmxNow();
				const open = weeks.filter((w) => openStatus(w, now) === 'open').length;
				count.innerHTML = `<b>${open}</b><span class="cafe-pill__t"> abiertas</span>`;
				count.hidden = false;
				pill.classList.toggle('has-open', open > 0);
				pill.title = `${open} cafeterías del mapa abiertas ahora (horarios de OpenStreetMap). Lado B: el mapa de cafés.`;
				pill.setAttribute('aria-label', `Mapa de cafés: ${open} abiertas ahora`);
			};
			update();
			setInterval(update, 60_000);
		} catch {
			/* sin datos: la píldora queda como enlace simple */
		}
	};
	const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
	if (idle) idle(load);
	else setTimeout(load, 800);
}

let started = false;

export function initSite() {
	if (started) return;
	started = true;
	initTheme();
	initClock();
	initMenu();
	initHeader();
	initMotion();
	initCafePill();
}
