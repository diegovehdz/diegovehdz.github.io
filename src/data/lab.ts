// Experimentos del laboratorio. `visual` usa los mismos componentes que los proyectos.
export interface LabItem {
	title: string;
	kicker: string;
	summary: string;
	href: string;
	visual: 'cafes' | 'mercado' | 'algoritmos' | 'montana' | 'trafico' | 'bungee' | 'arcane' | 'abnormality' | 'bordes' | 'tramado' | 'pesca' | 'escalera';
	status: string;
}

export const LAB: LabItem[] = [
	{
		title: 'Arcane Codex',
		kicker: 'Videojuego 3D · Unity WebGL',
		summary: 'El juego del mago y las runas, jugable en el navegador: una versión de demostración publicada en Unity Play.',
		href: '/proyectos/arcane-codex/#jugar',
		visual: 'arcane',
		status: 'jugable',
	},
	{
		title: 'Pesca en Xochimilco',
		kicker: 'Minijuego al estilo Stardew Valley',
		summary: 'Lanza la caña desde una trajinera y mantén al pez dentro de la barra. Hay especies nativas, invasoras y basura; los ajolotes regresan al agua.',
		href: '/lab/pesca/',
		visual: 'pesca',
		status: 'jugable',
	},
	{
		title: 'Escalera',
		kicker: 'Poople, en español',
		summary: 'Convierte la palabra del día en CACA cambiando una letra a la vez. Un reto nuevo cada medianoche, el mismo para todos.',
		href: '/lab/escalera/',
		visual: 'escalera',
		status: 'diario',
	},
	{
		title: 'Abnormality',
		kicker: 'Encuentra las anomalías',
		summary: 'Mi juego del primer semestre, portado de pygame al navegador con los dibujos originales. Tienes 60 segundos.',
		href: '/proyectos/abnormality/#jugar',
		visual: 'abnormality',
		status: 'jugable',
	},
	{
		title: 'Bordes en vivo',
		kicker: 'Sobel · Prewitt · Roberts · Canny',
		summary: 'Los filtros de mi app de procesamiento de imágenes, ahora sobre tu cámara y en tiempo real. Nada sale de tu navegador.',
		href: '/lab/bordes/',
		visual: 'bordes',
		status: 'en vivo',
	},
	{
		title: 'Tramado',
		kicker: 'Dithering y arte ASCII',
		summary: 'El motor que dibuja las imágenes de este sitio. Trama sus escenas 3D, una foto o tu cámara con Bayer, Floyd–Steinberg, Atkinson o ASCII, y guarda el resultado.',
		href: '/lab/tramado/',
		visual: 'tramado',
		status: 'en vivo',
	},
	{
		title: 'Mercado Justo',
		kicker: '¿Dónde conviene comprar?',
		summary: 'Arma tu lista del súper y el modelo de regresión estima cuánto te costaría en cada mercado y tianguis del estudio.',
		href: '/lab/mercado-justo/',
		visual: 'mercado',
		status: 'en vivo',
	},
	{
		title: 'Una intersección',
		kicker: 'Simulación de tráfico',
		summary: 'Autos que siguen el Intelligent Driver Model y semáforos que puedes ajustar para ver cómo crece o se vacía la fila.',
		href: '/proyectos/trafico-multiagente/',
		visual: 'trafico',
		status: 'demo',
	},
	{
		title: 'Montaña en 3D',
		kicker: 'Nube de puntos',
		summary: 'Seis mil puntos de fotogrametría de una montaña, girando en tu navegador con un proyector hecho a mano.',
		href: '/proyectos/mountain-king/',
		visual: 'montana',
		status: 'demo',
	},
	{
		title: 'Salto bungee',
		kicker: 'Física con RK4',
		summary: 'Mueve la rigidez de la cuerda, la masa y la resistencia del aire, y mira cuánto baja la persona y qué tan fuerte es el tirón.',
		href: '/proyectos/salto-bungee/',
		visual: 'bungee',
		status: 'demo',
	},
	{
		title: 'La ruta del café',
		kicker: 'El problema del agente viajero',
		summary: 'Un texto interactivo: por qué probar todas las rutas es imposible y cómo dos ideas simples dan rutas casi perfectas.',
		href: '/textos/ruta-del-cafe/',
		visual: 'algoritmos',
		status: 'texto',
	},
	{
		title: 'Cafeterías CDMX',
		kicker: 'Lado B · mapa y rutas',
		summary: 'Proyecto lateral: un mapa de cafeterías con filtros, "abierto ahora" y un planificador de rutas a pie.',
		href: '/cafes/',
		visual: 'cafes',
		status: 'lado B',
	},
];
