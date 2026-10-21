// Trabajos chicos o tempranos que no tienen página propia, recuperados del archivo de la carrera.
export interface ArchivoItem {
	year: number;
	title: string;
	kicker: string;
	detail: string;
}

export const ARCHIVO: ArchivoItem[] = [
	{
		year: 2024,
		title: 'Estructuras de datos en C++',
		kicker: 'Listas ligadas y pilas',
		detail: 'Problemas tipo LeetCode: detectar un ciclo en una lista ligada, invertirla, paréntesis válidos más largos y Two Sum.',
	},
	{
		year: 2024,
		title: 'Torre de caída con frenado magnético',
		kicker: 'MATLAB · RK4',
		detail:
			'Subida a velocidad constante, caída libre desde 59 m y frenado por corrientes de Foucault modelado como un dipolo magnético; además, un circuito RLC.',
	},
	{
		year: 2024,
		title: 'Sistema de vuelos',
		kicker: 'C++ · programación orientada a objetos',
		detail: 'Clases Usuario y Vuelo con persistencia en archivos de texto: registro, acceso, consulta de vuelos y kilómetros acumulados.',
	},
	{
		year: 2023,
		title: 'Primeros juegos en Python',
		kicker: 'pygame',
		detail: 'Tiro al blanco con puntuación por anillos, una tragamonedas de tres cilindros y un tablero de ajedrez a medio hacer.',
	},
];
