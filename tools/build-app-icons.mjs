/**
 * Genera los iconos de la app a partir del logo de BodyDraft.
 *
 * El logo original no sirve tal cual como icono por tres motivos:
 *   1. No es cuadrado (378x367) y un icono tiene que serlo.
 *   2. Lleva debajo el lema "DISEÑA · AGENDA · TATÚA" en una franja de
 *      14 px. A 48 px en la pantalla de inicio no se lee: solo ensucia.
 *   3. Android recorta el icono adaptativo con la forma que elija el
 *      sistema (circulo, squircle, gota), y solo garantiza que se vea
 *      el 66% central. El lockup tiene que caber ahi dentro.
 *
 * Asi que se recorta el lockup, se tira el lema y se recompone centrado
 * sobre el propio color de fondo del logo, en un lienzo cuadrado.
 *
 * Correr:  node tools/build-app-icons.mjs
 */
import Jimp from 'jimp-compact';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'assets/logo-bodydraft.png');

/** Cuanto se separa un pixel del color de fondo para contar como tinta. */
const INK_THRESHOLD = 40;

/** Margen que se deja alrededor del lockup al recortarlo, en pixeles. */
const CROP_MARGIN = 10;

const logo = await Jimp.read(SOURCE);
const { width: W, height: H, data } = logo.bitmap;
const pixel = (x, y) => {
  const i = (y * W + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};

const background = pixel(0, 0);
const isInk = (p) =>
  Math.abs(p[0] - background[0]) + Math.abs(p[1] - background[1]) + Math.abs(p[2] - background[2]) > INK_THRESHOLD;

const backgroundHex = `#${background.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// --- localizar el lockup -------------------------------------------
// El logo tiene dos bloques separados por una franja vacia: arriba
// "BodyDraft" y abajo el lema. Nos quedamos con el primero, que es el
// mas alto, sin dar por hecho a que altura empieza.

const inkPerRow = [];
for (let y = 0; y < H; y++) {
  let count = 0;
  for (let x = 0; x < W; x++) if (isInk(pixel(x, y))) count++;
  inkPerRow.push(count);
}

const bands = [];
let start = null;
for (let y = 0; y <= H; y++) {
  const hasInk = y < H && inkPerRow[y] > 2;
  if (hasInk && start === null) start = y;
  if (!hasInk && start !== null) {
    if (y - start > 3) bands.push({ top: start, bottom: y, height: y - start });
    start = null;
  }
}
if (!bands.length) throw new Error('no se encontro contenido en el logo');

const lockup = bands.reduce((a, b) => (b.height > a.height ? b : a));
let left = W;
let right = 0;
for (let y = lockup.top; y < lockup.bottom; y++) {
  for (let x = 0; x < W; x++) {
    if (isInk(pixel(x, y))) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
}

// Se recorta un CUADRADO del logo, no la caja ajustada al texto.
//
// El logo tiene un degradado radial detras de las letras: un recorte
// pegado al texto deja un rectangulo mas claro que, al pegarlo sobre un
// relleno liso, se ve como una costura. Recortando un cuadrado grande
// el degradado llega entero y sus bordes ya son del color de las
// esquinas, asi que no hay nada que disimular.
const below = bands.find((band) => band.top > lockup.bottom);
const floor = below ? below.top - 2 : H;
const side = Math.min(W, floor);
const crop = {
  x: Math.min(Math.max(0, Math.round((left + right) / 2 - side / 2)), W - side),
  y: Math.max(0, floor - side),
  width: side,
  height: side,
};

console.log(`logo ${W}x${H}, fondo ${backgroundHex}`);
console.log(`lockup en y ${lockup.top}..${lockup.bottom}, x ${left}..${right}`);
console.log(below ? `lema descartado (empieza en y ${below.top})` : 'sin lema que descartar');
console.log(`recorte cuadrado: ${side}x${side} en (${crop.x}, ${crop.y})`);

const lockupImage = logo.clone().crop(crop.x, crop.y, crop.width, crop.height);

// --- composicion ----------------------------------------------------

const BG_INT = Jimp.rgbaToInt(background[0], background[1], background[2], 255);

/** Donde cae el lockup DENTRO del recorte cuadrado. */
const box = {
  x: left - crop.x,
  y: lockup.top - crop.y,
  width: right - left + 1,
  height: lockup.height,
};

/**
 * Lienzo cuadrado con el lockup centrado y ocupando `coverage` del lado.
 *
 * Se centra el LOCKUP, no el recorte: el cuadrado mas grande que se
 * puede sacar sin pillar el lema no queda centrado sobre el texto, asi
 * que pegarlo tal cual deja el logo descolgado hacia abajo. Donde el
 * recorte no llega se rellena con el color de fondo, y no se nota
 * porque los bordes del recorte ya son ese color (entre #161419 y
 * #18151c, a dos o tres puntos del relleno).
 */
function square(size, coverage, { transparent = false } = {}) {
  const canvas = new Jimp(size, size, transparent ? 0x00000000 : BG_INT);

  // La escala la fija el lado mayor del lockup, para que `coverage`
  // signifique lo mismo sea el logo apaisado o vertical.
  const scale = (size * coverage) / Math.max(box.width, box.height);
  const scaled = lockupImage.clone().resize(Math.round(crop.width * scale), Jimp.AUTO, Jimp.RESIZE_BICUBIC);

  canvas.composite(
    scaled,
    Math.round(size / 2 - (box.x + box.width / 2) * scale),
    Math.round(size / 2 - (box.y + box.height / 2) * scale)
  );
  return canvas;
}

const outputs = [];

// Icono principal (iOS, y el que Expo reescala para todo lo demas).
outputs.push(['assets/icon.png', square(1024, 0.8)]);

// Capa de primer plano del icono adaptativo de Android. Encoge para
// que el lockup entre en el 66% central, que es lo unico que el
// sistema garantiza que se vea; el resto lo puede recortar la forma
// que elija el telefono.
outputs.push(['assets/android-icon-foreground.png', square(1024, 0.58)]);

// Icono monocromo (iconos tematizados de Android 13+): la misma silueta
// en blanco sobre transparente. Se saca por luminancia, no por color,
// porque el rosa y el azul del neon tienen brillos muy distintos.
const mono = square(1024, 0.58, { transparent: true });
{
  const canvas = square(1024, 0.58);
  const { data: src } = canvas.bitmap;
  const { data: dst } = mono.bitmap;
  for (let i = 0; i < src.length; i += 4) {
    const ink = Math.abs(src[i] - background[0]) + Math.abs(src[i + 1] - background[1]) + Math.abs(src[i + 2] - background[2]);
    const alpha = Math.min(255, Math.round((ink / 180) * 255));
    dst[i] = 255;
    dst[i + 1] = 255;
    dst[i + 2] = 255;
    dst[i + 3] = alpha;
  }
}
outputs.push(['assets/android-icon-monochrome.png', mono]);

// Favicon de la web.
outputs.push(['assets/favicon.png', square(96, 0.86)]);

for (const [path, image] of outputs) {
  await image.writeAsync(resolve(ROOT, path));
  console.log(`${path}  ${image.bitmap.width}x${image.bitmap.height}`);
}

console.log(`\nColor de fondo para app.json: ${backgroundHex}`);
