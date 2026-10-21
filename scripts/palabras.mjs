// Genera src/data/palabras.json: las palabras de cuatro letras que acepta Escalera (/lab/escalera/).
// Fuente: el paquete an-array-of-spanish-words (MIT, derivado de las listas de Letterpress), ya sin acentos y con ñ.
//
// Uso:
//   npm install --no-save an-array-of-spanish-words
//   npm run palabras -- node_modules/an-array-of-spanish-words/index.json
import { readFileSync, writeFileSync } from 'node:fs';

const [src] = process.argv.slice(2);
if (!src) {
	console.error('Uso: npm run palabras -- <ruta al index.json de an-array-of-spanish-words>');
	process.exit(1);
}

// insultos y groserías: no se aceptan ni aparecen como pista
const BLOQUEADAS = new Set(['puta', 'puto', 'joto', 'naco', 'coño', 'culo', 'jodo', 'joda', 'jode', 'homo', 'nazi']);

const words = JSON.parse(readFileSync(src, 'utf8'));
const out = [...new Set(words.filter((w) => /^[a-zñ]{4}$/.test(w) && !BLOQUEADAS.has(w)))].sort();
writeFileSync('src/data/palabras.json', `${JSON.stringify(out)}\n`);
console.log(`${out.length} palabras de cuatro letras → src/data/palabras.json`);
