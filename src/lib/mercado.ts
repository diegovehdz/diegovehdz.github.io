// Modelo de Mercado Justo: ln(precio) = intercepto + efecto del producto + efecto del lugar.
// Igual que en el notebook: si existe un precio mediano observado se usa; si no, se estima con el modelo.
import data from '../data/mercado-justo.json';

export type Origen = 'observado' | 'estimado' | 'sin dato';
export interface Producto {
	id: string;
	nombre: string;
	unidad: string;
}
export interface Lugar {
	id: string;
	nombre: string;
	tipo: string;
	zona: string;
	lat: number;
	lng: number;
	ceda_km: number;
	registros: number;
	puestos: number;
	cluster: number | null;
	indice: number | null;
}
export interface FilaCosto {
	lugar: Lugar;
	costo: number;
	estimados: number;
	sinDato: number;
	vsMasBarato: number;
}

export const productos = data.productos as Producto[];
export const lugares = data.lugares as Lugar[];
export const metricas = data.metricas;
const observados = data.observados as Record<string, number>;
const modelo = data.modelo as {
	intercepto: number;
	producto: Record<string, number>;
	lugar: Record<string, number>;
	productos_modelo: string[];
};

/** Lugares con al menos 20 registros: los que el notebook considera comparables. */
export const MIN_REGISTROS = 20;
export const lugaresComparables = lugares.filter((l) => l.registros >= MIN_REGISTROS);

export function precio(lugar: string, producto: string): { precio: number | null; origen: Origen } {
	const key = `${lugar}|${producto}`;
	if (key in observados) return { precio: observados[key], origen: 'observado' };
	if (!modelo.productos_modelo.includes(producto)) return { precio: null, origen: 'sin dato' };
	const z = modelo.intercepto + (modelo.producto[producto] ?? 0) + (modelo.lugar[lugar] ?? 0);
	return { precio: Math.exp(z), origen: 'estimado' };
}

export function costoCanasta(lista: Record<string, number>, lista_lugares: Lugar[] = lugares): FilaCosto[] {
	const filas = lista_lugares.map((lugar) => {
		let costo = 0;
		let estimados = 0;
		let sinDato = 0;
		for (const [producto, cantidad] of Object.entries(lista)) {
			if (!cantidad) continue;
			const p = precio(lugar.id, producto);
			if (p.precio === null) {
				sinDato++;
				continue;
			}
			costo += cantidad * p.precio;
			if (p.origen === 'estimado') estimados++;
		}
		return { lugar, costo, estimados, sinDato, vsMasBarato: 0 };
	});
	filas.sort((a, b) => a.costo - b.costo);
	const min = filas[0]?.costo || 1;
	filas.forEach((f) => (f.vsMasBarato = (f.costo / min - 1) * 100));
	return filas;
}

/** Productos con precio observado en todos los lugares comparables (la "canasta común" del notebook). */
export function canastaComun(): string[] {
	return productos
		.map((p) => p.id)
		.filter((id) => lugaresComparables.every((l) => `${l.id}|${id}` in observados))
		.sort();
}

export const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? id;

export const mxn = (n: number) =>
	new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n);
