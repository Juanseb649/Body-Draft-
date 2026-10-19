/**
 * Pone fotos reales de tatuajes, segun el estilo de cada uno, a los dos
 * tatuadores de demostracion (Nora Vega: blackwork; Ruben Salas:
 * realismo), en lugar de las imagenes al azar de picsum que les dejo
 * 20261002130000_seed_demo_artists.sql.
 *
 * Uso:   node tools/seed-demo-tattoos.mjs
 *
 * Inicia sesion como cada cuenta demo (con la anon key, igual que la
 * app), sube las fotos de tools/demo-tattoos/ a SU carpeta del bucket
 * `portfolio` y actualiza sus trabajos publicados y su portafolio. Pasa
 * por las mismas policies de RLS que la app: no necesita la service key.
 * Se puede correr mas de una vez (sobrescribe, no duplica).
 *
 * Creditos y licencias de las fotos: tools/demo-tattoos/CREDITS.md
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = resolve(ROOT, 'tools/demo-tattoos');
const PASSWORD = 'BodyDraft2026!';

/**
 * `oldTitle` es el titulo con el que el seed creo el trabajo: se busca
 * por el viejo o por el nuevo, asi la segunda corrida tambien lo encuentra.
 */
const ARTISTS = [
  {
    email: 'nora.vega@bodydraft.demo',
    works: [
      { oldTitle: 'Helecho en el antebrazo', file: 'nora-buho.jpg', title: 'Buho mandala en el antebrazo', description: 'Blackwork con puntillismo y mandala de fondo.', style: 'Blackwork' },
      { oldTitle: 'Polilla geometrica', file: 'nora-mariposa.jpg', title: 'Mariposa geometrica', description: 'Geometria y mandala en la pantorrilla, dos sesiones.', style: 'Blackwork' },
      { oldTitle: 'Rama de olivo', file: 'nora-dragon.jpg', title: 'Dragon en la espalda', description: 'Relleno solido en negro, una sola pieza de espalda alta.', style: 'Blackwork' },
    ],
    portfolio: ['nora-buho.jpg', 'nora-mariposa.jpg', 'nora-dragon.jpg'],
  },
  {
    email: 'ruben.salas@bodydraft.demo',
    works: [
      { oldTitle: 'Retrato en negro y gris', file: 'ruben-retrato.jpg', title: 'Retrato en negro y gris', description: 'Tres sesiones de cuatro horas.', style: 'Realismo' },
      { oldTitle: 'Lobo en el hombro', file: 'ruben-lobo-brazo.jpg', title: 'Lobo en el brazo', description: 'Degradado suave, sin linea de contorno.', style: 'Realismo' },
      { oldTitle: 'Reloj de bolsillo', file: 'ruben-virgen.jpg', title: 'Virgen coronada en el hombro', description: 'Realismo en negro y gris con un toque de color en la corona.', style: 'Realismo' },
    ],
    portfolio: ['ruben-lobo-pecho.jpg', 'ruben-retrato.jpg', 'ruben-lobo-brazo.jpg'],
  },
];

function readEnv() {
  const out = {};
  for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
const BASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!BASE || !ANON) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

async function call(path, { token, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { apikey: ANON, authorization: `Bearer ${token ?? ANON}`, ...headers },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // no es JSON
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return json;
}

const jsonBody = (value) => ({ body: JSON.stringify(value), headers: { 'content-type': 'application/json' } });

async function login(email) {
  const r = await call('/auth/v1/token?grant_type=password', { method: 'POST', ...jsonBody({ email, password: PASSWORD }) });
  return { token: r.access_token, userId: r.user.id };
}

/** Sube (o reemplaza) la foto en <uid>/demo/ y devuelve su URL publica. */
async function upload(token, userId, file) {
  const path = `${userId}/demo/${file}`;
  await call(`/storage/v1/object/portfolio/${path}`, {
    token,
    method: 'POST',
    body: readFileSync(resolve(PHOTOS, file)),
    headers: { 'content-type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '3600' },
  });
  return `${BASE}/storage/v1/object/public/portfolio/${path}`;
}

async function main() {
  for (const artist of ARTISTS) {
    const { token, userId } = await login(artist.email);
    console.log(`\n${artist.email}`);

    const urls = {};
    for (const file of new Set([...artist.works.map((w) => w.file), ...artist.portfolio])) {
      urls[file] = await upload(token, userId, file);
      console.log(`  subida  ${file}`);
    }

    const mine = await call(`/rest/v1/designs?select=id,title&artist_id=eq.${userId}`, { token });
    for (const work of artist.works) {
      const fields = { title: work.title, description: work.description, style: work.style, image_url: urls[work.file] };
      const row = mine.find((d) => d.title === work.oldTitle || d.title === work.title);
      if (row) {
        await call(`/rest/v1/designs?id=eq.${row.id}`, { token, method: 'PATCH', ...jsonBody(fields) });
        console.log(`  trabajo ${work.title} (actualizado)`);
      } else {
        await call('/rest/v1/designs', { token, method: 'POST', ...jsonBody({ ...fields, artist_id: userId }) });
        console.log(`  trabajo ${work.title} (nuevo)`);
      }
    }

    await call(`/rest/v1/profiles?id=eq.${userId}`, {
      token,
      method: 'PATCH',
      ...jsonBody({ portfolio_image_urls: artist.portfolio.map((f) => urls[f]) }),
    });
    console.log(`  portafolio ${artist.portfolio.length} fotos`);
  }
  console.log('\nListo. Reabre Inicio o Artistas en la app para ver las fotos nuevas.');
}

main().catch((e) => {
  console.error(`\nNo se completo: ${e.message}`);
  process.exit(1);
});
