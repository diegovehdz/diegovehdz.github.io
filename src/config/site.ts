// Todo lo que es "dato personal" del sitio vive aquí: cámbialo en un solo lugar.

export const SITE = {
	name: 'Diego Vergara',
	fullName: 'Diego Vergara Hernández',
	initials: 'DV',
	tagline: 'Portafolio, laboratorio y textos',
	description:
		'Diego Vergara Hernández — estudiante de Ingeniería en Tecnologías Computacionales en el Tec de Monterrey. Proyectos de software, simulaciones, datos de la CDMX y experimentos interactivos.',
	degree: 'Ingeniería en Tecnologías Computacionales',
	degreeShort: 'ITC',
	school: 'Tec de Monterrey',
	semester: 7,
	city: 'Ciudad de México',
	cityShort: 'CDMX',
	// Se muestra como una etiqueta en la portada. Déjalo en '' para ocultarla.
	availability: 'Abierto a prácticas profesionales y proyectos',
	url: 'https://diegovehdz.github.io',
	domain: 'diegovehdz.github.io',
	email: 'diegovehdz@gmail.com',
	handle: 'diegovehdz',
	socials: [
		{ label: 'GitHub', href: 'https://github.com/diegovehdz', handle: '@diegovehdz' },
		// { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tu-usuario', handle: 'in/tu-usuario' },
		// { label: 'Instagram', href: 'https://instagram.com/tu-usuario', handle: '@tu-usuario' },
	],
	languages: [
		{ name: 'Español', level: 'Nativo' },
		// { name: 'Inglés', level: 'Avanzado (B2/C1)' },
	],
} as const;

export const NAV = [
	{ label: 'Proyectos', href: '/proyectos/' },
	{ label: 'Lab', href: '/lab/' },
	{ label: 'Textos', href: '/textos/' },
	{ label: 'CV', href: '/cv/' },
] as const;

// Lado B: el mapa de cafeterías vive como una píldora en el encabezado, fuera de la navegación principal.
export const CAFES_LINK = { label: 'Cafés', href: '/cafes/' } as const;

export const TAGS: Record<string, string> = {
	web: 'Web',
	sistemas: 'Sistemas',
	ia: 'IA',
	datos: 'Datos',
	simulacion: 'Simulación',
	algoritmos: 'Algoritmos',
	juegos: 'Juegos',
};

export const EDUCATION = [
	{
		place: 'Tec de Monterrey',
		title: 'Ingeniería en Tecnologías Computacionales',
		period: '2023 — 2027',
		detail:
			'Penúltimo semestre. Concentración en inteligencia artificial avanzada para la ciencia de datos: aprendizaje automático, visión computacional con PyTorch y procesamiento de lenguaje natural.',
	},
];

export const FOCUS_AREAS = [
	{
		title: 'Algoritmos avanzados',
		detail: 'Cadenas (KMP, Manacher, Huffman), grafos (MST, flujo máximo, TSP) y optimización multiobjetivo.',
	},
	{
		title: 'Sistemas multiagentes',
		detail: 'Simulación con Mesa y visualización en Unity; agentes reactivos, A* y Q-learning.',
	},
	{
		title: 'Desarrollo de software',
		detail: 'Proyectos con socios formadores: arquitectura, pruebas, CI y trabajo en equipos grandes.',
	},
	{
		title: 'Ciencia de datos',
		detail: 'Desde levantar datos en campo hasta modelos de regresión, K-means y redes neuronales.',
	},
];

export const EXPERIENCE = [
	{
		org: 'Proyecto Monarca · 02 Solutions',
		period: 'feb — jun 2026',
		role: 'Desarrollo full-stack',
		detail:
			'Plataforma de viajes corporativos hecha por un equipo de ~15 personas. Implementé la bitácora de acciones sobre solicitudes, catálogos contables y la validación segura de comprobantes XML.',
		href: '/proyectos/monarca/',
	},
	{
		org: 'Protección Civil · Alcaldía Cuajimalpa',
		period: 'ago — nov 2025',
		role: 'Desarrollo web (socio formador)',
		detail:
			'MVP para registrar reportes de emergencias médicas y urbanas. Construí la bitácora de auditoría en MongoDB y mejoré accesibilidad e interfaz.',
		href: '/proyectos/emergencias-cuajimalpa/',
	},
	{
		org: 'Mercado Justo · proyecto de datos',
		period: 'ene — sep 2026',
		role: 'Levantamiento de datos y modelado',
		detail:
			'Levanté 146 de los 279 precios del conjunto de datos en tres mercados de la CDMX y participé en el modelado con K-means y regresión lineal.',
		href: '/proyectos/mercado-justo/',
	},
];

export const SKILLS = [
	{ group: 'Lenguajes', items: ['TypeScript', 'JavaScript', 'Python', 'C++', 'SQL', 'C#', 'MATLAB'] },
	{ group: 'Web', items: ['React', 'NestJS', 'Express', 'Vite', 'TanStack Query', 'Tailwind CSS', 'Astro'] },
	{ group: 'Datos e IA', items: ['pandas', 'NumPy', 'scikit-learn', 'Keras', 'PyTorch', 'Mesa'] },
	{ group: 'Bases de datos', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'TypeORM'] },
	{ group: 'Herramientas', items: ['Git', 'GitHub Actions', 'Docker', 'Cypress', 'Vitest', 'Unity'] },
];
