// Mapa de cafeterías: filtros, "abierto ahora", café al azar, cerca de mí y planificador de rutas.
import L from 'leaflet';
import { TILE_OPTIONS, TILE_URL } from '../lib/map-tiles';
import { cdmxNow, formatWeek, openStatus, parseHours, type OpenStatus, type Week } from '../lib/opening-hours';
import { haversine, nearestNeighbor, pathLength, twoOpt, type LatLng } from '../lib/tsp';

interface Cafe {
	id: string;
	nombre: string;
	lat: number;
	lng: number;
	colonia: string;
	alcaldia: string;
	direccion?: string;
	tags: string[];
	horario?: string;
	web?: string;
	instagram?: string;
	fuente: string;
	nota?: string;
	visitado?: boolean;
	favorito?: boolean;
}

const MAX_STOPS = 10;
const WALK_KMH = 4.5;

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
const km = (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

const cafes: Cafe[] = JSON.parse($('#cafes-data').textContent || '[]');
const byId = new Map(cafes.map((c) => [c.id, c]));
const weeks = new Map<string, Week | null>(cafes.map((c) => [c.id, parseHours(c.horario)]));

const state = {
	q: '',
	tags: new Set<string>(),
	alcaldia: '',
	openNow: false,
	selected: null as string | null,
	route: [] as string[],
	user: null as LatLng | null,
};

const els = {
	list: $<HTMLOListElement>('[data-list]'),
	q: $<HTMLInputElement>('[data-q]'),
	alcaldia: $<HTMLSelectElement>('[data-alcaldia]'),
	open: $<HTMLButtonElement>('[data-open]'),
	status: $<HTMLElement>('[data-status]'),
	route: $<HTMLElement>('[data-route]'),
	stops: $<HTMLOListElement>('[data-route-stops]'),
	summary: $<HTMLElement>('[data-route-summary]'),
	gmaps: $<HTMLAnchorElement>('[data-route-gmaps]'),
};

// ---------- mapa ----------
const map = L.map($<HTMLElement>('[data-map]'), { zoomControl: false, attributionControl: true, minZoom: 10, maxZoom: 19 });
L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
map.fitBounds(L.latLngBounds(cafes.map((c) => [c.lat, c.lng] as [number, number])), { padding: [36, 36] });

const markers = new Map<string, L.Marker>();
for (const c of cafes) {
	const icon = L.divIcon({
		className: 'pin-wrap',
		html: `<span class="pin${c.favorito ? ' is-fav' : ''}" data-pin="${c.id}"></span>`,
		iconSize: [18, 18],
		iconAnchor: [9, 9],
		popupAnchor: [0, -10],
	});
	const m = L.marker([c.lat, c.lng], { icon, title: c.nombre, alt: c.nombre, riseOnHover: true }).addTo(map);
	m.bindPopup(() => popupHtml(c), { maxWidth: 300, autoPanPadding: [24, 24] });
	m.on('click', () => select(c.id, { fly: false, popup: false }));
	m.on('popupclose', () => {
		if (state.selected === c.id) setSelected(null);
	});
	markers.set(c.id, m);
}
const pinEl = (id: string) => markers.get(id)?.getElement()?.querySelector<HTMLElement>('.pin') ?? null;

// capas que cambian (en un objeto para que TypeScript no las dé por nulas tras las funciones que las asignan)
const layers: { route: L.Polyline | null; user: L.Marker | null } = { route: null, user: null };

// ---------- utilidades ----------
function status(id: string): OpenStatus {
	return openStatus(weeks.get(id) ?? null, cdmxNow());
}

function statusLabel(s: OpenStatus) {
	return s === 'open' ? 'abierta' : s === 'closed' ? 'cerrada' : 'sin horario';
}

function visible(c: Cafe) {
	if (state.alcaldia && c.alcaldia !== state.alcaldia) return false;
	if (state.tags.size && !c.tags.some((t) => state.tags.has(t))) return false;
	if (state.openNow && status(c.id) !== 'open') return false;
	if (state.q) {
		const hay = norm(`${c.nombre} ${c.colonia} ${c.alcaldia} ${c.direccion ?? ''} ${c.tags.join(' ')}`);
		if (!norm(state.q).split(/\s+/).every((w) => hay.includes(w))) return false;
	}
	return true;
}

const gmapsPlace = (c: Cafe) =>
	`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.nombre}, ${c.colonia}, Ciudad de México`)}`;
const osmUrl = (c: Cafe) => {
	const m = c.fuente.match(/^osm:(node|way|relation)\/(\d+)$/);
	return m ? `https://www.openstreetmap.org/${m[1]}/${m[2]}` : null;
};

function popupHtml(c: Cafe) {
	const s = status(c.id);
	const hours = formatWeek(weeks.get(c.id) ?? null);
	const inRoute = state.route.includes(c.id);
	const osm = osmUrl(c);
	const ig = c.instagram ? (c.instagram.startsWith('http') ? c.instagram : `https://instagram.com/${c.instagram.replace(/^@/, '')}`) : null;
	return `<div class="pop">
		<strong class="pop__name">${esc(c.nombre)}${c.favorito ? ' <span class="star">★</span>' : ''}</strong>
		<span class="pop__meta">${esc([c.direccion, `${c.colonia}, ${c.alcaldia}`].filter(Boolean).join(' · '))}</span>
		${hours ? `<span class="pop__hours"><span class="st st--${s}">${statusLabel(s)}</span> · ${esc(hours)}</span>` : '<span class="pop__hours"><span class="st">sin horario</span></span>'}
		${c.tags.length ? `<span class="pop__tags">${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
		${c.nota ? `<p class="pop__note">${esc(c.nota)}</p>` : ''}
		<span class="pop__links">
			<a href="${gmapsPlace(c)}" target="_blank" rel="noopener">Google Maps ↗</a>
			${c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">Sitio ↗</a>` : ''}
			${ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener">Instagram ↗</a>` : ''}
			${osm ? `<a href="${osm}" target="_blank" rel="noopener">OSM</a>` : ''}
		</span>
		<button class="pill pill--sm${inRoute ? ' pill--solid' : ''}" type="button" data-route-toggle="${c.id}">${inRoute ? 'Quitar de la ruta' : 'Añadir a la ruta'}</button>
	</div>`;
}

// ---------- lista ----------
function render() {
	const shown = cafes.filter(visible);
	if (state.user) {
		const u = state.user;
		shown.sort((a, b) => haversine(u, a) - haversine(u, b));
	} else {
		shown.sort((a, b) => Number(!!b.favorito) - Number(!!a.favorito) || a.nombre.localeCompare(b.nombre, 'es'));
	}
	const ids = new Set(shown.map((c) => c.id));
	els.list.innerHTML = shown
		.map((c) => {
			const s = status(c.id);
			const n = state.route.indexOf(c.id);
			const dist = state.user ? ` · ${km(haversine(state.user, c))}` : '';
			return `<li class="cafe${state.selected === c.id ? ' is-active' : ''}" data-id="${c.id}">
				<button class="cafe__main" type="button" data-select="${c.id}">
					<span class="cafe__name">${esc(c.nombre)}${c.favorito ? '<span class="star" aria-label="favorita">★</span>' : ''}</span>
					<span class="cafe__meta">${esc(c.colonia)} · ${esc(c.alcaldia)}${dist}</span>
					<span class="cafe__badges"><span class="st st--${s}">${statusLabel(s)}</span>${c.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>
				</button>
				<button class="cafe__add" type="button" data-route-toggle="${c.id}" aria-pressed="${n >= 0}" aria-label="${n >= 0 ? `Quitar ${esc(c.nombre)} de la ruta` : `Añadir ${esc(c.nombre)} a la ruta`}">${n >= 0 ? n + 1 : '+'}</button>
			</li>`;
		})
		.join('');
	for (const c of cafes) pinEl(c.id)?.classList.toggle('is-dim', !ids.has(c.id));
	const filtered = shown.length !== cafes.length;
	els.status.textContent = filtered ? `Mostrando ${shown.length} de ${cafes.length} cafeterías` : `${cafes.length} cafeterías`;
	if (state.openNow) els.status.textContent += ' · abiertas según OpenStreetMap';
	return shown;
}

function setSelected(id: string | null) {
	if (state.selected) pinEl(state.selected)?.classList.remove('is-active');
	state.selected = id;
	if (id) pinEl(id)?.classList.add('is-active');
	els.list.querySelectorAll('.cafe').forEach((li) => li.classList.toggle('is-active', (li as HTMLElement).dataset.id === id));
	const url = new URL(location.href);
	if (id) url.searchParams.set('c', id);
	else url.searchParams.delete('c');
	history.replaceState(null, '', url);
}

function select(id: string, opts: { fly?: boolean; popup?: boolean } = {}) {
	const c = byId.get(id);
	if (!c) return;
	setSelected(id);
	const m = markers.get(id)!;
	if (opts.fly !== false) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
	if (opts.popup !== false) setTimeout(() => m.openPopup(), opts.fly !== false ? 450 : 0);
	els.list.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------- ruta ----------
function toggleRoute(id: string) {
	const i = state.route.indexOf(id);
	if (i >= 0) state.route.splice(i, 1);
	else {
		if (state.route.length >= MAX_STOPS) {
			els.status.textContent = `La ruta admite hasta ${MAX_STOPS} cafeterías.`;
			return;
		}
		state.route.push(id);
	}
	optimizeAndDraw();
	render();
	const m = markers.get(id);
	if (m?.isPopupOpen()) m.setPopupContent(popupHtml(byId.get(id)!));
}

function optimizeAndDraw() {
	layers.route?.remove();
	layers.route = null;
	cafes.forEach((c) => {
		const p = pinEl(c.id);
		p?.classList.remove('is-stop');
		p?.removeAttribute('data-n');
	});
	const stops = state.route.map((id) => byId.get(id)!).filter(Boolean);
	const url = new URL(location.href);
	if (!stops.length) {
		els.route.hidden = true;
		url.searchParams.delete('r');
		history.replaceState(null, '', url);
		return;
	}
	const pts: LatLng[] = [...(state.user ? [state.user] : []), ...stops];
	const offset = state.user ? 1 : 0;
	const d = (i: number, j: number) => haversine(pts[i], pts[j]);
	const order = twoOpt(nearestNeighbor(pts.length, d, 0), d, false);
	const total = pathLength(order, d);
	state.route = order.filter((i) => i >= offset).map((i) => stops[i - offset].id);

	state.route.forEach((id, i) => {
		const p = pinEl(id);
		p?.classList.add('is-stop');
		p?.setAttribute('data-n', String(i + 1));
	});
	const line = order.map((i) => [pts[i].lat, pts[i].lng] as [number, number]);
	if (line.length > 1) layers.route = L.polyline(line, { className: 'route-line', interactive: false }).addTo(map);

	const minutes = Math.round((total / WALK_KMH) * 60);
	els.summary.textContent =
		stops.length > 1 || state.user ? `${stops.length} paradas · ${km(total)} · ~${minutes} min a pie` : '1 parada · agrega más';
	els.stops.innerHTML =
		(state.user ? '<li class="is-start">Tu ubicación</li>' : '') +
		state.route
			.map((id) => `<li>${esc(byId.get(id)!.nombre)}<button type="button" data-route-toggle="${id}" aria-label="Quitar">×</button></li>`)
			.join('');

	const coords = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
	const seq = order.map((i) => pts[i]);
	const g = new URL('https://www.google.com/maps/dir/');
	g.searchParams.set('api', '1');
	g.searchParams.set('origin', coords(seq[0]));
	g.searchParams.set('destination', coords(seq[seq.length - 1]));
	if (seq.length > 2) g.searchParams.set('waypoints', seq.slice(1, -1).map(coords).join('|'));
	g.searchParams.set('travelmode', 'walking');
	els.gmaps.href = g.toString();
	els.route.hidden = false;

	url.searchParams.set('r', state.route.join(','));
	history.replaceState(null, '', url);
}

// ---------- eventos ----------
document.addEventListener('click', (e) => {
	const t = e.target as HTMLElement;
	const toggle = t.closest<HTMLElement>('[data-route-toggle]');
	if (toggle) {
		toggleRoute(toggle.dataset.routeToggle!);
		return;
	}
	const sel = t.closest<HTMLElement>('[data-select]');
	if (sel) select(sel.dataset.select!);
});

els.list.addEventListener('mouseover', (e) => {
	const li = (e.target as HTMLElement).closest<HTMLElement>('.cafe');
	document.querySelectorAll('.pin.is-hover').forEach((p) => p.classList.remove('is-hover'));
	if (li) pinEl(li.dataset.id!)?.classList.add('is-hover');
});
els.list.addEventListener('mouseleave', () => document.querySelectorAll('.pin.is-hover').forEach((p) => p.classList.remove('is-hover')));

let qTimer = 0;
els.q.addEventListener('input', () => {
	clearTimeout(qTimer);
	qTimer = window.setTimeout(() => {
		state.q = els.q.value.trim();
		render();
	}, 120);
});

document.querySelectorAll<HTMLButtonElement>('[data-tag]').forEach((btn) =>
	btn.addEventListener('click', () => {
		const t = btn.dataset.tag!;
		if (state.tags.has(t)) state.tags.delete(t);
		else state.tags.add(t);
		btn.setAttribute('aria-pressed', String(state.tags.has(t)));
		render();
	}),
);

els.alcaldia.addEventListener('change', () => {
	state.alcaldia = els.alcaldia.value;
	const shown = render();
	if (state.alcaldia && shown.length) map.flyToBounds(L.latLngBounds(shown.map((c) => [c.lat, c.lng] as [number, number])), { padding: [48, 48], maxZoom: 15 });
});

els.open.addEventListener('click', () => {
	state.openNow = !state.openNow;
	els.open.setAttribute('aria-pressed', String(state.openNow));
	render();
});

$<HTMLButtonElement>('[data-random]').addEventListener('click', () => {
	const pool = cafes.filter((c) => visible(c) && c.id !== state.selected);
	if (!pool.length) {
		els.status.textContent = 'No hay cafeterías con estos filtros.';
		return;
	}
	const c = pool[Math.floor(Math.random() * pool.length)];
	els.status.textContent = `El azar dice: ${c.nombre}`;
	select(c.id);
});

$<HTMLButtonElement>('[data-near]').addEventListener('click', () => {
	if (!('geolocation' in navigator)) {
		els.status.textContent = 'Tu navegador no comparte ubicación.';
		return;
	}
	els.status.textContent = 'Buscando tu ubicación…';
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			state.user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			layers.user?.remove();
			layers.user = L.marker([state.user.lat, state.user.lng], {
				icon: L.divIcon({ className: 'pin-wrap', html: '<span class="pin-me"></span>', iconSize: [16, 16], iconAnchor: [8, 8] }),
				title: 'Tu ubicación',
				keyboard: false,
			}).addTo(map);
			const shown = render();
			const near = shown.slice(0, 5).map((c) => [c.lat, c.lng] as [number, number]);
			map.flyToBounds(L.latLngBounds([[state.user.lat, state.user.lng], ...near]), { padding: [60, 60], maxZoom: 16 });
			if (shown[0]) els.status.textContent = `La más cercana: ${shown[0].nombre}, a ${km(haversine(state.user, shown[0]))}`;
			optimizeAndDraw();
		},
		(err) => {
			els.status.textContent =
				err.code === err.PERMISSION_DENIED ? 'Sin permiso de ubicación. Puedes activarlo en tu navegador.' : 'No se pudo obtener tu ubicación.';
		},
		{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
	);
});

$<HTMLButtonElement>('[data-reset]').addEventListener('click', () => {
	state.q = '';
	state.tags.clear();
	state.alcaldia = '';
	state.openNow = false;
	els.q.value = '';
	els.alcaldia.value = '';
	els.open.setAttribute('aria-pressed', 'false');
	document.querySelectorAll('[data-tag]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
	render();
	map.flyToBounds(L.latLngBounds(cafes.map((c) => [c.lat, c.lng] as [number, number])), { padding: [36, 36] });
});

$<HTMLButtonElement>('[data-route-clear]').addEventListener('click', () => {
	state.route = [];
	optimizeAndDraw();
	render();
});

$<HTMLButtonElement>('[data-route-share]').addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(location.href);
		els.status.textContent = 'Enlace de la ruta copiado.';
	} catch {
		els.status.textContent = 'Copia el enlace desde la barra de direcciones.';
	}
});

// ---------- estado inicial desde la URL ----------
const params = new URL(location.href).searchParams;
const fromUrl = (params.get('r') || '')
	.split(',')
	.filter((id) => byId.has(id))
	.slice(0, MAX_STOPS);
if (fromUrl.length) {
	state.route = fromUrl;
	optimizeAndDraw();
	if (layers.route) map.fitBounds(layers.route.getBounds(), { padding: [60, 60] });
}
render();
const initial = params.get('c');
if (initial && byId.has(initial)) select(initial);

// los estados de "abierta/cerrada" cambian con la hora
setInterval(() => render(), 60_000);
