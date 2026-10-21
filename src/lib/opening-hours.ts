// Intérprete mínimo del formato `opening_hours` de OpenStreetMap.
// Soporta lo que de verdad aparece en los datos: "24/7", rangos de días, listas, varios horarios por día,
// horarios que cruzan la medianoche y "off". Si una regla no se entiende, esos días quedan como "desconocido".

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_TOKEN = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)';

type Interval = [number, number]; // minutos desde las 00:00; el fin puede pasar de 1440
export type Week = (Interval[] | null)[]; // null = desconocido, [] = cerrado
export type OpenStatus = 'open' | 'closed' | 'unknown';

function expandDays(part: string): number[] {
	const out: number[] = [];
	for (const token of part.split(',')) {
		if (token === 'PH') continue;
		const [a, b] = token.split('-');
		const ia = DAYS.indexOf(a as (typeof DAYS)[number]);
		const ib = b ? DAYS.indexOf(b as (typeof DAYS)[number]) : ia;
		if (ia < 0 || ib < 0) continue;
		for (let i = ia, guard = 0; guard < 7; i = (i + 1) % 7, guard++) {
			out.push(i);
			if (i === ib) break;
		}
	}
	return out;
}

function parseTimes(rest: string): Interval[] | null {
	if (!rest) return null;
	const out: Interval[] = [];
	for (const piece of rest.split(/\s*,\s*/)) {
		const m = piece.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
		if (!m) return null;
		const h1 = Number(m[1]);
		const h2 = Number(m[3]);
		if (h1 > 24 || h2 > 30) return null;
		const start = h1 * 60 + Number(m[2]);
		let end = h2 * 60 + Number(m[4]);
		if (end <= start) end += 1440;
		out.push([start, end]);
	}
	return out;
}

export function parseHours(src?: string | null): Week | null {
	if (!src) return null;
	const s = src.trim();
	if (s === '24/7') return Array.from({ length: 7 }, () => [[0, 1440] as Interval]);
	const week: Week = Array.from({ length: 7 }, () => null);
	// Separador estándar ";". Algunos datos usan ", " antes de un día; "Sa,Su" (sin espacio) es una lista de días.
	const rules = s.split(new RegExp(`\\s*;\\s*|,\\s+(?=${DAY_TOKEN}\\b)`)).filter(Boolean);
	const ruleRe = new RegExp(`^(${DAY_TOKEN}(?:-${DAY_TOKEN})?(?:,${DAY_TOKEN}(?:-${DAY_TOKEN})?)*)?\\s*(.*)$`);
	let understood = false;
	for (const rule of rules) {
		const m = rule.trim().match(ruleRe);
		if (!m) continue;
		const daysPart = m[1];
		const rest = (m[2] || '').trim();
		const days = daysPart ? expandDays(daysPart) : [0, 1, 2, 3, 4, 5, 6];
		if (days.length === 0) continue;
		if (/^(off|closed)$/i.test(rest)) {
			days.forEach((d) => (week[d] = []));
			understood = true;
			continue;
		}
		const intervals = parseTimes(rest);
		if (!intervals) continue;
		days.forEach((d) => (week[d] = intervals));
		understood = true;
	}
	return understood ? week : null;
}

/** Día (0 = lunes) y minuto actuales en la Ciudad de México. */
export function cdmxNow(date = new Date()): { day: number; min: number } {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Mexico_City',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(date);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
	return { day: Math.max(day, 0), min: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function openStatus(week: Week | null, now = cdmxNow()): OpenStatus {
	if (!week) return 'unknown';
	const yesterday = week[(now.day + 6) % 7];
	if (yesterday) for (const [, end] of yesterday) if (end > 1440 && now.min < end - 1440) return 'open';
	const today = week[now.day];
	if (today === null) return 'unknown';
	for (const [start, end] of today) if (now.min >= start && now.min < end) return 'open';
	return 'closed';
}

const hhmm = (m: number) => {
	const t = m % 1440;
	return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** "Lun–Vie 08:00–20:00 · Sáb 09:00–14:00 · Dom cerrado" */
export function formatWeek(week: Week | null): string {
	if (!week) return '';
	const label = (iv: Interval[] | null) =>
		iv === null ? null : iv.length === 0 ? 'cerrado' : iv.map(([a, b]) => `${hhmm(a)}–${b === 1440 ? '24:00' : hhmm(b)}`).join(', ');
	const groups: { from: number; to: number; text: string }[] = [];
	week.forEach((iv, d) => {
		const text = label(iv);
		if (text === null) return;
		const last = groups[groups.length - 1];
		if (last && last.text === text && last.to === d - 1) last.to = d;
		else groups.push({ from: d, to: d, text });
	});
	if (groups.length === 1 && groups[0].from === 0 && groups[0].to === 6) return `Todos los días ${groups[0].text}`;
	return groups
		.map((g) => `${g.from === g.to ? DAY_ES[g.from] : `${DAY_ES[g.from]}–${DAY_ES[g.to]}`} ${g.text}`)
		.join(' · ');
}
