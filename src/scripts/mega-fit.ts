// Ajusta las líneas de .mega al ancho de su contenedor.
// Modo normal: cada línea mide exactamente el ancho. Modo uniforme: todas usan el tamaño de la más ancha.
const lastWidth = new WeakMap<HTMLElement, number>();

function fit(el: HTMLElement, force = false) {
	const width = el.clientWidth;
	if (!width || (!force && lastWidth.get(el) === width)) return;
	lastWidth.set(el, width);
	const scale = Number.parseFloat(el.dataset.scale || '1') || 1;
	const lines = [...el.querySelectorAll<HTMLElement>('.mega__line')];
	lines.forEach((line) => (line.style.fontSize = '100px'));
	const widths = lines.map((line) => line.getBoundingClientRect().width);
	if ('uniform' in el.dataset) {
		const max = Math.max(...widths);
		if (max > 0) lines.forEach((line) => (line.style.fontSize = `${((100 * width * scale) / max).toFixed(2)}px`));
	} else {
		lines.forEach((line, i) => {
			if (widths[i] > 0) line.style.fontSize = `${((100 * width * scale) / widths[i]).toFixed(2)}px`;
		});
	}
}

const all = () => document.querySelectorAll<HTMLElement>('[data-mega]');

/** Vuelve a medir todo (por ejemplo, después de partir el texto en letras). */
export function refitMega() {
	all().forEach((el) => fit(el, true));
}

let started = false;

export function initMega() {
	if (started) return;
	started = true;
	refitMega();
	document.fonts?.ready.then(refitMega);
	const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target as HTMLElement)));
	all().forEach((el) => ro.observe(el));
}
