// Física del minijuego de pesca, al estilo de Stardew Valley: una barra que sube mientras mantienes presionado y
// cae por gravedad, un pez que se mueve con su propio carácter, y un medidor que se llena mientras el pez está
// dentro de la barra. Todo en unidades del riel (0 = abajo, 1 = arriba) y por tick de 1/60 s.

export type Movimiento = 'mixto' | 'suave' | 'dardo' | 'hundido' | 'flotador';

export interface Conducta {
	dificultad: number;
	movimiento: Movimiento;
}

export interface Pelea {
	/** base de la barra */
	barra: number;
	vBarra: number;
	/** alto de la barra */
	alto: number;
	/** centro del pez */
	pez: number;
	vPez: number;
	objetivo: number | null;
	/** empuje acumulado hacia abajo (hundido) o hacia arriba (flotador) */
	deriva: number;
	/** 0 … 1; empieza en 0.3 */
	progreso: number;
	perfecto: boolean;
	ticks: number;
}

export const TICK = 1000 / 60;
const GRAVEDAD = 0.00062;
const SUBIDA = 0.00072;
const VMAX = 0.021;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export function nuevaPelea(alto = 0.26, rand = Math.random): Pelea {
	return {
		barra: 0,
		vBarra: 0,
		alto,
		pez: 0.25 + rand() * 0.5,
		vPez: 0,
		objetivo: null,
		deriva: 0,
		progreso: 0.3,
		perfecto: true,
		ticks: 0,
	};
}

/** Avanza un tick. Devuelve el estado de la pelea. */
export function paso(p: Pelea, c: Conducta, presionado: boolean, rand = Math.random): 'sigue' | 'atrapado' | 'escapo' {
	// ---- barra: sube mientras se presiona, cae por gravedad y rebota un poco en el fondo ----
	p.vBarra = clamp(p.vBarra + (presionado ? SUBIDA : -GRAVEDAD), -VMAX, VMAX);
	p.barra += p.vBarra;
	if (p.barra < 0) {
		p.barra = 0;
		p.vBarra = Math.abs(p.vBarra) > 0.004 ? -p.vBarra * 0.35 : 0;
	}
	const tope = 1 - p.alto;
	if (p.barra > tope) {
		p.barra = tope;
		p.vBarra = 0;
	}

	// ---- pez: elige destinos al azar; la dificultad decide qué tan seguido y qué tan lejos ----
	const d = c.dificultad;
	const m = c.movimiento;
	const libre = p.objetivo === null;
	if ((libre || m !== 'suave') && rand() < (m === 'suave' ? d / 420 : d / 1100)) {
		const alcance = Math.min(0.95, (d + 20 + rand() * 40) / 100);
		p.objetivo = clamp(p.pez + (rand() * 2 - 1) * alcance * 0.85, 0.02, 0.98);
	}
	if (m === 'dardo' && rand() < d / 800) {
		p.objetivo = clamp(p.pez + (rand() < 0.5 ? -1 : 1) * (0.25 + rand() * 0.3), 0.02, 0.98);
	}
	if (m === 'hundido') p.deriva = Math.max(p.deriva - 0.000025, -0.0016);
	else if (m === 'flotador') p.deriva = Math.min(p.deriva + 0.000025, 0.0016);

	if (p.objetivo !== null) {
		const k = 6 + rand() * 14 + (100 - Math.min(100, d)) * 0.6;
		const acc = (p.objetivo - p.pez) / k;
		p.vPez += (acc - p.vPez) / 5;
		if (Math.abs(p.pez - p.objetivo) < 0.008) p.objetivo = null;
	} else {
		p.vPez *= 0.92;
	}
	p.pez = clamp(p.pez + p.vPez + p.deriva, 0.02, 0.98);
	if (p.pez <= 0.02 || p.pez >= 0.98) {
		p.vPez = 0;
		p.deriva *= 0.6;
	}

	// ---- medidor ----
	const dentro = p.pez >= p.barra && p.pez <= p.barra + p.alto;
	if (dentro) p.progreso += 0.0042;
	else {
		p.progreso -= 0.0032 * (0.8 + d / 250);
		if (p.ticks > 45) p.perfecto = false;
	}
	p.ticks++;
	if (p.progreso >= 1) return 'atrapado';
	if (p.progreso <= 0) return 'escapo';
	return 'sigue';
}

export interface ConPesos {
	id: string;
	zona: { orilla: number; canal: number };
	noche?: number;
}

/** Elige qué pica según la zona (qué tan lejos lanzaste), la hora y el pez del día. */
export function elegir<T extends ConPesos>(peces: T[], zona: 'orilla' | 'canal', noche: boolean, delDia: string | null, rand = Math.random): T {
	const pesos = peces.map((p) => p.zona[zona] * (noche && p.noche ? p.noche : 1) * (p.id === delDia ? 2.5 : 1));
	let r = rand() * pesos.reduce((a, b) => a + b, 0);
	for (let i = 0; i < peces.length; i++) {
		r -= pesos[i];
		if (r <= 0) return peces[i];
	}
	return peces[peces.length - 1];
}

/** Talla al azar dentro del rango, cargada hacia lo chico; una pesca perfecta suma un poco. */
export function talla([min, max]: [number, number], perfecto: boolean, rand = Math.random) {
	const t = min + (max - min) * Math.pow(rand(), 1.6) * (perfecto ? 1.12 : 1);
	return Math.round(Math.min(max, t) * 10) / 10;
}
