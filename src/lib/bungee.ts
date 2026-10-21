// Modelo del salto bungee (mismo planteamiento que los scripts de MATLAB):
// fase 1, caída con resistencia del aire lineal; fase 2, la cuerda se tensa y actúa como resorte amortiguado.
// Aquí se resuelve todo junto con RK4: m·u'' = −m·g − β·u' − k·min(u, 0), con u = altura sobre el punto donde la cuerda se tensa.

export interface BungeeParams {
	m: number; // masa (kg)
	beta: number; // resistencia del aire (kg/s)
	k: number; // constante elástica de la cuerda (N/m)
	L: number; // longitud natural de la cuerda (m)
	g: number;
	T: number; // duración simulada (s)
	dt: number;
}

export const DEFAULTS: BungeeParams = { m: 80, beta: 0.69, k: 10.7, L: 30, g: 9.81, T: 40, dt: 0.02 };

export const CASES = [
	{ id: 'trampolin', label: 'Trampolín', v0: 4 },
	{ id: 'clavado', label: 'Clavado', v0: -4 },
	{ id: 'caida', label: 'Caída libre', v0: 0 },
] as const;

export interface BungeeRun {
	t: number[];
	y: number[]; // altura respecto a la plataforma (0 = plataforma, negativo = abajo)
	minY: number;
	tMin: number;
	maxG: number;
}

export function simulate(v0: number, p: BungeeParams = DEFAULTS): BungeeRun {
	const acc = (u: number, v: number) => -p.g - (p.beta / p.m) * v - (u < 0 ? (p.k / p.m) * u : 0);
	let u = p.L;
	let v = v0;
	const t: number[] = [0];
	const y: number[] = [0];
	let minY = 0;
	let tMin = 0;
	let maxG = 0;
	const steps = Math.round(p.T / p.dt);
	for (let i = 1; i <= steps; i++) {
		const h = p.dt;
		const k1v = acc(u, v);
		const k1u = v;
		const k2v = acc(u + (h / 2) * k1u, v + (h / 2) * k1v);
		const k2u = v + (h / 2) * k1v;
		const k3v = acc(u + (h / 2) * k2u, v + (h / 2) * k2v);
		const k3u = v + (h / 2) * k2v;
		const k4v = acc(u + h * k3u, v + h * k3v);
		const k4u = v + h * k3v;
		u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
		v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
		const yy = u - p.L;
		t.push(i * h);
		y.push(yy);
		if (yy < minY) {
			minY = yy;
			tMin = i * h;
		}
		// aceleración que "siente" la persona (sin contar la gravedad): fuerzas de la cuerda y el aire
		const felt = Math.abs(acc(u, v) + p.g) / p.g;
		if (felt > maxG) maxG = felt;
	}
	return { t, y, minY, tMin, maxG };
}

/** Convierte una corrida en un path de SVG dentro de un rectángulo. */
export function toPath(run: BungeeRun, box: { x: number; y: number; w: number; h: number }, yMin: number, T: number): string {
	const sx = (t: number) => box.x + (t / T) * box.w;
	const sy = (v: number) => box.y + (v / yMin) * box.h;
	let d = '';
	const stride = Math.max(1, Math.floor(run.t.length / 500));
	for (let i = 0; i < run.t.length; i += stride) d += `${i ? 'L' : 'M'}${sx(run.t[i]).toFixed(1)} ${sy(run.y[i]).toFixed(1)}`;
	return d;
}
