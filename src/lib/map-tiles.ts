// Mapa base de los mapas del sitio: teselas estándar de OpenStreetMap (gratis y sin llave de API).
// El color de cada tema sale de un filtro CSS (--tiles-filter en global.css), así que no hace falta cambiar de URL.
// Uso justo: https://operations.osmfoundation.org/policies/tiles/ — para mucho tráfico, usa un proveedor con cuenta
// (p. ej. Stadia Maps o MapTiler) y cambia solo estas constantes.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_OPTIONS = {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
};
