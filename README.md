# diegovehdz.github.io

Portafolio, laboratorio y textos de **Diego Vergara Hernández**: proyectos de la carrera desde el primer semestre, juegos que corren en el navegador (Arcane Codex, Abnormality, una pesca en Xochimilco y una escalera de palabras diaria), experimentos interactivos (detección de bordes y tramado con tu cámara, modelo de precios de Mercado Justo, simulaciones) y textos de divulgación. Las imágenes son escenas 3D propias, renderizadas con un raymarcher y tramadas en el navegador. El mapa de cafeterías de la CDMX vive como "lado B" en el encabezado.

Hecho con [Astro](https://astro.build) 7, salida 100 % estática. El JavaScript solo carga donde hace falta: el movimiento del sitio, los mapas, los juegos y las simulaciones.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias (Node 22.12 o más nuevo) |
| `npm run dev` | Servidor local en `http://localhost:4321` |
| `npm run build` | Genera el sitio en `dist/` |
| `npm run preview` | Sirve `dist/` para revisarlo antes de publicar |
| `npm run compartir` | Genera el sitio y lo sirve en `http://localhost:4400` para compartirlo con un enlace temporal (ver "Publicar") |
| `npm run check` | Revisa tipos de TypeScript y errores en `.astro` |
| `npm run cafes:osm -- "Nombre"` | Busca una cafetería en OpenStreetMap y genera su entrada (`--add` la agrega) |
| `npm run cafes:import -- mapa.kml` | Importa cafeterías desde Google My Maps (`--write` guarda) |
| `npm run art` | Vuelve a renderizar las escenas de `public/art/` (`npm run art -- espada` para una sola) |
| `npm run palabras -- ruta/index.json` | Regenera la lista de palabras de Escalera (ver "Juegos") |

## Dónde está cada cosa

```
src/
├─ config/site.ts        ← tus datos: nombre, correo, redes, educación, experiencia, habilidades
├─ content/
│  ├─ proyectos/*.mdx    ← un archivo por proyecto
│  └─ textos/*.mdx       ← artículos (pueden incluir componentes interactivos)
├─ data/
│  ├─ archivo.ts         ← trabajos chicos o tempranos sin página propia
│  ├─ cafes.json         ← las cafeterías del mapa
│  ├─ lab.ts             ← tarjetas del laboratorio (el orden importa: la portada usa las primeras)
│  ├─ mercado-justo.json ← modelo y catálogos de Mercado Justo
│  ├─ palabras.json      ← palabras de cuatro letras que acepta Escalera
│  ├─ escalera.ts        ← meta, palabras comunes y de partida de Escalera
│  ├─ peces.ts           ← especies de Pesca en Xochimilco (datos y pixel art)
│  └─ sars-cov-2.json    ← mutaciones del gen S, recalculadas de los FASTA del proyecto
├─ components/
│  ├─ visuals/           ← ilustraciones y simulaciones de cada proyecto
│  ├─ Marquee, Rotator, Timeline, Mega, Title  ← piezas con movimiento
│  ├─ Dither.astro       ← imagen tramada (puntos o ASCII) con el color del tema
│  ├─ GameEmbed.astro    ← juegos de Unity Play (se cargan al hacer clic)
│  ├─ FishingGame.astro  ← Pesca en Xochimilco
│  ├─ WordLadder.astro   ← Escalera
│  ├─ AbnormalityGame.astro ← port web del juego de pygame
│  └─ TspPlayground.astro
├─ lib/                  ← lógica reutilizable (TSP, horarios de OSM, modelo de precios, física del bungee, filtros de imagen, tramado)
├─ pages/                ← rutas del sitio
├─ scripts/              ← JS del navegador (movimiento, mapa de cafés, tema, reloj…)
└─ styles/               ← global.css (sistema visual), motion.css (animaciones), cafes.css
scripts/                 ← herramientas de línea de comandos (cafeterías)
scripts/art/             ← raymarcher de SDF que genera las escenas (mano, luna, columnas, volcanes, espada)
public/                  ← favicon, og.png, datos, video del tráiler y los dibujos de Abnormality
public/art/              ← imágenes base de las escenas: luminancia + alfa, 20–100 KB cada una
```

## Editar el contenido

### Tus datos

Casi todo lo personal vive en `src/config/site.ts`: nombre, correo, redes (descomenta LinkedIn o Instagram), idiomas, la etiqueta de disponibilidad de la portada, educación, experiencia y habilidades. El CV (`/cv/`) se arma solo con esos datos y con los proyectos destacados.

### Imágenes tramadas

Las imágenes del sitio (las manos de la portada, la luna, las columnas, los volcanes, la espada del póster de Arcane Codex) no son fotos: son escenas modeladas con funciones de distancia y renderizadas por `scripts/art/render.mjs`, un raymarcher en Node.js. El script guarda solo luminancia y alfa; el navegador las trama al tamaño exacto de pantalla y con el color del tema (`src/scripts/dither-art.ts`).

```astro
<Dither art="columnas" fit="cover" reveal="up" />
```

| Propiedad | Qué hace |
| --- | --- |
| `art` | Nombre de un PNG en `public/art/` |
| `cell` | Tamaño del punto en px (3 por defecto). La variable CSS `--cell` lo cambia por pantalla |
| `fit`, `position` | Como `object-fit` y `object-position` |
| `reveal` | `fade` (los puntos aparecen en el orden de la matriz de Bayer), `left`/`right`/`up`/`down` (un frente que avanza) o `none` |
| `mode` | `dots` o `ascii` (con `ramp`: `clasica`, `numeros`, `fina`, `bloques`) |
| `contrast`, `gamma` | Curva de tono antes de tramar |
| `light` | En el tema claro, `invert` (la sombra es tinta, como un grabado) o `same` |

Para agregar una imagen tuya, pon la imagen **original** (foto o render, de preferencia con fondo transparente o negro) en `public/art/` y úsala con `<Dither art="nombre">`. No uses imágenes que ya vienen tramadas: tramarlas otra vez produce moiré. El laboratorio [`/lab/tramado/`](src/pages/lab/tramado.astro) sirve para probar ajustes y exportar PNG ya tramados (con fondo transparente) para otros usos.

Para una escena nueva, agrégala en `scripts/art/scenes.mjs` y corre `npm run art -- nombre` (con `--scale=0.5 --preview=carpeta` para iterar rápido; las escenas `prueba-*` muestran la mano desde cuatro ángulos).

### Proyectos

Cada proyecto es un `.mdx` en `src/content/proyectos/`. El *frontmatter* controla la tarjeta y la ficha:

```yaml
title: Monarca
kicker: Plataforma de gestión de viajes corporativos   # subtítulo
summary: Una o dos frases.
year: 2026
period: feb — jun 2026
context: Socio formador / curso
role: Qué hiciste tú (sé específico)
team: Con quién
stack: [NestJS, React]
tags: [web, sistemas]        # web · sistemas · ia · datos · simulacion · algoritmos · juegos
featured: true               # aparece en la portada y en el CV
order: 1                     # orden en las listas
visual: monarca              # ilustración (ver src/components/visuals/ProjectVisual.astro)
links:
  - label: Repositorio
    href: https://github.com/...
```

Debajo va el texto en Markdown. Los comentarios `{/* TODO … */}` no se publican: úsalos como recordatorios.

### Textos

Los artículos van en `src/content/textos/`. Con `draft: true` solo se ven en `npm run dev`. Como son MDX, puedes importar componentes interactivos (mira cómo `ruta-del-cafe.mdx` usa `<TspPlayground />`). El RSS (`/rss.xml`) se genera solo.

### Cafeterías

Cada entrada de `src/data/cafes.json`:

```json
{
  "id": "cafe-avellaneda",
  "nombre": "Café Avellaneda",
  "lat": 19.348251, "lng": -99.160689,
  "colonia": "La Concepción", "alcaldia": "Coyoacán",
  "direccion": "Higuera 40",
  "tags": ["especialidad"],
  "horario": "Mo-Su 08:00-22:00",
  "web": "https://…",
  "fuente": "osm:node/123",
  "nota": "Tu recomendación, en una o dos frases.",
  "visitado": true,
  "favorito": true
}
```

- `horario` usa el formato de OpenStreetMap (`Mo-Fr 08:00-20:00; Sa 09:00-14:00`). Con él funciona "Abiertas ahora".
- `favorito: true` pone una estrella en el mapa y la sube al inicio de la lista.
- `visitado` alimenta el contador de "visitadas" de la página.

**La lista inicial salió de OpenStreetMap** (44 cafeterías conocidas en 8 alcaldías). Revísala: borra las que no te convenzan, marca tus favoritas y escribe tus notas. Así se vuelve *tu* mapa.

Para agregar una nueva:

```bash
npm run cafes:osm -- "Nombre de la cafetería" --add
```

O, si prefieres curar en **Google My Maps**: exporta el mapa (⋮ → *Exportar a KML/KMZ* → "Exportar como KML") y corre

```bash
npm run cafes:import -- ruta/al/mapa.kml --write
```

Cada capa del mapa se vuelve una etiqueta y la descripción de cada lugar se vuelve tu nota.

> El mapa original de Heliouz (2023) ya no es público. Si algún día usas datos de alguien más, dale crédito en la página.

## Diseño

- **Plantilla #1 (oscura, por defecto):** `#141414` · `#e8e7e7` · `#ad3030`.
- **Plantilla #2 (tema claro):** `#f8f4ec` · `#594832` · `#bf092f`.
- Todos los colores son variables CSS en `src/styles/global.css`. El botón ◐ cambia de tema y la elección se guarda en el navegador.
- **Tipografías:** las plantillas usan Agrandir (títulos) y Garet (texto), que no tienen licencia web gratuita. Aquí se usan **Mona Sans** (ancho 112 %, peso 900) y **Montserrat**, que fueron las más parecidas en una comparación lado a lado. Si compras la licencia web de Agrandir, cambia `--font-display`.
- Componentes base: `MetaBar` (la fila de metadatos de cada lámina), `Title` (títulos rojos apilados que se ajustan a su columna), `Mega` (texto gigante que se sale del borde), `Frame` (marcos de imagen).

## Movimiento

Todo el movimiento depende de la clase `.motion` en `<html>`, que solo se agrega si el visitante **no** pidió reducir el movimiento en su sistema. Sin ella el sitio se ve completo y estático, y si el JavaScript falla, a los 2.5 s se muestra todo.

| Pieza | Cómo se usa |
| --- | --- |
| Títulos (`<Title>`) | Cada línea sube al entrar en pantalla. `drift={-3}` los desplaza un poco con el scroll; `vt="p-slug"` los conecta entre páginas. |
| Nombre gigante (`<Mega>`) | `split` (letras que suben al cargar) y `drifts={[7, -9]}` (cada línea se separa con el scroll). |
| `<Marquee items label>` | Texto grande en movimiento; acelera y cambia de sentido con el scroll y se frena con el mouse. |
| `<Rotator words>` | Palabra que cambia cada 2.4 s (los lectores de pantalla oyen la lista completa). |
| `data-scramble`, `data-count` | Texto que se "descifra" al aparecer (etiquetas de sección) y números que cuentan. |
| `.reveal` | Aparición suave; la mayoría de los bloques la reciben solos. |
| `<Dither reveal>` | Las imágenes tramadas aparecen al entrar en pantalla; en la portada, los brazos se dibujan desde los bordes hacia las yemas. |

Entre páginas se usan las *View Transitions* del navegador (`@view-transition` en `motion.css`): en Chrome, Edge y Safari el título de un proyecto "viaja" de la tarjeta a su página.

## Juegos

Un proyecto se vuelve jugable con el campo `play` del *frontmatter*:

```yaml
play:
  kind: unity            # o abnormality
  url: https://play.unity.com/api/v1/games/game/<id>/build/latest/frame
  note: Texto corto debajo del juego.
```

El build de Unity solo se descarga cuando alguien presiona "Jugar".

El build de Arcane Codex es público en Unity Play, así que carga para cualquier visitante.

### Pesca en Xochimilco (`/lab/pesca/`)

Minijuego al estilo de Stardew Valley en `src/components/FishingGame.astro`. La física está en `src/lib/pesca.ts` (pasos fijos de 1/60 s) y las especies, con su pixel art, en `src/data/peces.ts`: para agregar una, copia una entrada y dibuja su `sprite` con `#` (tinta), `r` (rojo) y `.` (vacío). La dificultad se calibró simulando peleas con un jugador automático; si cambias la física, vale la pena repetirlo. La bitácora se guarda en el navegador de cada visitante.

### Escalera (`/lab/escalera/`)

Poople en español: de la palabra del día a `META` (por defecto `caca`, en `src/data/escalera.ts`), una letra a la vez. El par se calcula en el navegador con una búsqueda en anchura sobre las palabras comunes, y la palabra de partida sale del día en la Ciudad de México, así que es la misma para todos sin servidor. Para regenerar la lista de palabras:

```sh
npm install --no-save an-array-of-spanish-words
npm run palabras -- node_modules/an-array-of-spanish-words/index.json
```

El script quita acentos (la ñ se queda) y groserías; las listas `COMUNES` e `INICIOS` se editan a mano.

## Publicar

### Enlace temporal (reenvío de puertos de VS Code)

Para enseñarlo sin publicarlo: corre `npm run compartir` en la terminal de VS Code, abre el panel **Puertos** (junto a la terminal), usa **Reenviar un puerto** con `4400`, inicia sesión con GitHub si te lo pide y cambia la visibilidad del puerto a **Pública** (clic derecho → Visibilidad del puerto). La dirección de la columna "Dirección reenviada" es el enlace. Funciona mientras la computadora, VS Code y el servidor sigan prendidos; la primera vez, los visitantes ven un aviso de Microsoft sobre túneles de desarrollo y le dan "Continuar". `astro.config.mjs` ya acepta los dominios `*.devtunnels.ms`.

### GitHub Pages (gratis)

1. Crea un repositorio llamado `diegovehdz.github.io` y sube este proyecto a la rama `main`.
2. En GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Cada push a `main` publica el sitio con `.github/workflows/deploy.yml`.

Si usas otro nombre de repositorio, el sitio queda en `diegovehdz.github.io/<repo>/`: agrega `base: '/<repo>'` en `astro.config.mjs`.

### Dominio propio

Compra el dominio y cambia la URL en tres lugares: `site` en `astro.config.mjs`, `SITE.url`/`SITE.domain` en `src/config/site.ts` y `public/robots.txt`. Para GitHub Pages, agrega un archivo `public/CNAME` con el dominio.

### Mapas

Los mapas usan las teselas estándar de OpenStreetMap (gratis y sin llave de API, con [uso justo](https://operations.osmfoundation.org/policies/tiles/)), teñidas con un filtro CSS para cada tema. Si el sitio crece mucho, cambia el proveedor en `src/lib/map-tiles.ts`.

## Pendientes

- [ ] LinkedIn y otras redes en `SITE.socials`. Inglés en `SITE.languages`.
- [ ] Confirmar la etiqueta de disponibilidad de la portada (`SITE.availability`).
- [ ] Revisar "Mi parte" en los proyectos de equipo (Mountain King, Agentes) y agregar capturas.
- [ ] Curar el mapa de cafeterías: notas, favoritas, visitadas.
- [ ] Leer y ajustar a tu voz el texto "¿Cuál es la ruta más corta para visitar cinco cafeterías?".

## Créditos

- Ubicaciones y horarios de cafeterías © colaboradores de OpenStreetMap (ODbL).
- Datos de Mercado Justo: Héctor Lugo Gabino, Santino Matías Im y Diego Vergara Hernández.
- Idea del mapa de cafeterías: el mapa de [Heliouz](https://heliouz.com/) (2023).
- Análisis del SARS-CoV-2: Diego Vergara Hernández y Patricio Mourra Cossio (2024). Secuencias de NCBI.
- Funciones de distancia (cono redondeado, elipsoide aproximado) y sombras suaves del raymarcher: artículos de [Íñigo Quílez](https://iquilezles.org/articles/).
- Escalera está inspirada en [Poople](https://pooplegame.com/); su lista de palabras viene de [an-array-of-spanish-words](https://github.com/words/an-array-of-spanish-words) (MIT), derivada de las listas de Letterpress.
- La mecánica de Pesca en Xochimilco está inspirada en la pesca de *Stardew Valley* (ConcernedApe); el código y el arte son propios.
