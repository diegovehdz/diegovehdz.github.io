// Especies de Pesca en Xochimilco (/lab/pesca/). Los sprites son pixel art de una sola tinta:
// "#" = tinta, "r" = rojo, "." = transparente. Todos miran a la derecha.
import type { Movimiento } from '../lib/pesca';

export type Clase = 'nativa' | 'invasora' | 'protegida' | 'basura';

export interface Pez {
	id: string;
	nombre: string;
	/** artículo para "¡Un ajolote!"; la basura ya lo trae en el nombre */
	art?: 'un' | 'una';
	cientifico?: string;
	clase: Clase;
	/** 0–100: qué tan rápido y errático se mueve en la barra */
	dificultad: number;
	movimiento: Movimiento;
	/** talla en cm (mín, máx) */
	talla: [number, number];
	/** peso relativo para picar cerca de la orilla y en el canal */
	zona: { orilla: number; canal: number };
	/** multiplicador de noche (hora de la Ciudad de México) */
	noche?: number;
	dato: string;
	sprite: string[];
}

export const PECES: Pez[] = [
	{
		id: 'acocil',
		art: 'un',
		nombre: 'Acocil',
		cientifico: 'Cambarellus montezumae',
		clase: 'nativa',
		dificultad: 18,
		movimiento: 'hundido',
		talla: [2, 5],
		zona: { orilla: 30, canal: 5 },
		dato: 'Un acocil, el pequeño crustáceo de agua dulce del Valle de México. Se comía desde tiempos mexicas y todavía se vende en mercados.',
		sprite: ['#.#.#.####..#.', '.############.', '#.#.#.#####.##', '......#.#.#...'],
	},
	{
		id: 'charal',
		art: 'un',
		nombre: 'Charal',
		cientifico: 'Chirostoma sp.',
		clase: 'nativa',
		dificultad: 32,
		movimiento: 'dardo',
		talla: [5, 12],
		zona: { orilla: 28, canal: 14 },
		dato: 'Pez plateado de los lagos del centro de México. Seco y frito es botana; en tamales, un clásico.',
		sprite: ['#..######..', '#########.#', '#..######..'],
	},
	{
		id: 'mexclapique',
		art: 'un',
		nombre: 'Mexclapique',
		cientifico: 'Girardinichthys viviparus',
		clase: 'protegida',
		dificultad: 48,
		movimiento: 'flotador',
		talla: [3, 6],
		zona: { orilla: 6, canal: 5 },
		dato: 'Pez endémico del Valle de México: sus crías nacen vivas. Quedan muy pocos, así que lo regresas al agua.',
		sprite: ['...###...', '#.######.', '######.##', '#.######.', '...###...'],
	},
	{
		id: 'tilapia',
		art: 'una',
		nombre: 'Tilapia',
		cientifico: 'Oreochromis sp.',
		clase: 'invasora',
		dificultad: 40,
		movimiento: 'mixto',
		talla: [14, 34],
		zona: { orilla: 12, canal: 22 },
		dato: 'Llegó de África para criarse en granjas y se quedó en los canales. Compite por comida con las especies nativas: sacarla ayuda.',
		sprite: ['...#.#.#....', '..########..', '#.#########.', '##########.#', '#.#########.', '..########..', '....#.#.....'],
	},
	{
		id: 'carpa',
		art: 'una',
		nombre: 'Carpa',
		cientifico: 'Cyprinus carpio',
		clase: 'invasora',
		dificultad: 56,
		movimiento: 'suave',
		talla: [25, 70],
		zona: { orilla: 4, canal: 26 },
		dato: 'Especie introducida que remueve el fondo, enturbia el agua y se come los huevos del ajolote. Es de las que más daño hacen.',
		sprite: ['....#######....', '#..##########..', '##############.', '############.##', '##############.', '#..###########.', '....#######.#..'],
	},
	{
		id: 'ajolote',
		art: 'un',
		nombre: 'Ajolote',
		cientifico: 'Ambystoma mexicanum',
		clase: 'protegida',
		dificultad: 70,
		movimiento: 'hundido',
		talla: [15, 30],
		zona: { orilla: 2, canal: 8 },
		noche: 2.5,
		dato: 'Solo vive en los canales de Xochimilco y está en peligro crítico. Regenera patas, branquias y hasta partes del corazón. Se libera de inmediato.',
		sprite: ['...........#.#.#', '............###.', '#.....##########', '############.###', '.##############.', '....#.#....#.#..'],
	},
	{
		id: 'ajolote-rosa',
		art: 'un',
		nombre: 'Ajolote leucístico',
		cientifico: 'Ambystoma mexicanum',
		clase: 'protegida',
		dificultad: 86,
		movimiento: 'mixto',
		talla: [15, 28],
		zona: { orilla: 0, canal: 1 },
		noche: 2.5,
		dato: 'La variante rosada de los acuarios. En la naturaleza casi no existe: es una mutación que conservan los criaderos. ¡Rarísimo!',
		sprite: ['...........r.r.r', '............rrr.', 'r.....rrrrrrrrrr', 'rrrrrrrrrrrr#rrr', '.rrrrrrrrrrrrrr.', '....r.r....r.r..'],
	},
	{
		id: 'chancla',
		nombre: 'Una chancla',
		clase: 'basura',
		dificultad: 0,
		movimiento: 'mixto',
		talla: [24, 28],
		zona: { orilla: 5, canal: 3 },
		dato: 'Alguien la perdió en una trajinera. Sacar basura del canal también cuenta.',
		sprite: ['..#..#....', '...##.....', '.########.', '##########', '.########.'],
	},
	{
		id: 'lata',
		nombre: 'Una lata',
		clase: 'basura',
		dificultad: 0,
		movimiento: 'mixto',
		talla: [12, 12],
		zona: { orilla: 4, canal: 2 },
		dato: 'Una lata oxidada. Afuera del agua hace menos daño.',
		sprite: ['.####.', '######', '#rrrr#', '#rrrr#', '#rrrr#', '######', '.####.'],
	},
	{
		id: 'bolsa',
		nombre: 'Una bolsa de plástico',
		clase: 'basura',
		dificultad: 0,
		movimiento: 'mixto',
		talla: [30, 40],
		zona: { orilla: 3, canal: 3 },
		dato: 'Los canales reciben basura de media ciudad. Una bolsa menos.',
		sprite: ['.#....#.', '#.#..#.#', '########', '#......#', '#......#', '#......#', '########'],
	},
];
