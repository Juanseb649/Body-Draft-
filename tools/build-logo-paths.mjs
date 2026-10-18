/**
 * Convierte las palabras del logo ("Body", "Draft") en trazados SVG a
 * partir de la propia fuente Sacramento del proyecto.
 *
 * Por que: dibujado como <Text>, iOS recortaba lo que la cursiva saca
 * fuera de la caja del texto (la cola de la "y", el bucle de la "f"):
 * en el iPhone se leia "Bodu Dralt". Como trazado vectorial no hay caja
 * que recorte, y se ve igual en iOS, Android y web.
 *
 * Correr:  node tools/build-logo-paths.mjs
 * Genera:  src/components/molecules/logoGlyphs.generated.ts
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = resolve(ROOT, 'assets/fonts/Sacramento-Regular.ttf');
const OUT = resolve(ROOT, 'src/components/molecules/logoGlyphs.generated.ts');

/** Tamaño de fuente de los trazados: el componente los escala despues. */
const UNITS = 100;
const WORDS = ['Body', 'Draft'];

const font = opentype.loadSync(FONT);
const words = {};
for (const word of WORDS) {
  const path = font.getPath(word, 0, 0, UNITS);
  const box = path.getBoundingBox();
  words[word] = {
    d: path.toPathData(2),
    // Caja de la TINTA (no la del texto), con la linea base en y = 0.
    box: { x1: +box.x1.toFixed(2), y1: +box.y1.toFixed(2), x2: +box.x2.toFixed(2), y2: +box.y2.toFixed(2) },
  };
}

const header = `// Generado por tools/build-logo-paths.mjs desde assets/fonts/Sacramento-Regular.ttf.
// No editar a mano: volver a correr el script.

/** Trazados de las palabras del logo, a tamaño de fuente ${UNITS}, linea base en y = 0. */
export const LOGO_UNITS = ${UNITS};
`;
const body = `export const LOGO_GLYPHS = ${JSON.stringify(words, null, 2)} as const;\n`;
writeFileSync(OUT, header + '\n' + body);
console.log('ok', Object.fromEntries(Object.entries(words).map(([k, v]) => [k, v.box])));
