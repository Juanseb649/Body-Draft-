/**
 * Comprueba de punta a punta que los tatuadores de demostracion
 * quedaron bien aplicados en Supabase.
 *
 * No mira la base de datos por detras: inicia sesion con una de las
 * cuentas sembradas y luego lee `profiles` y `designs` por la API
 * publica, con la misma anon key y las mismas policies de RLS que usa
 * la app. Si esto pasa, la app los va a ver.
 *
 * Uso:  node tools/verify-artists.mjs
 * Antes: aplicar supabase/migrations/20261002120000_role_from_signup.sql
 *        y 20261002130000_seed_demo_artists.sql en el SQL Editor.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DEMO_PASSWORD = 'BodyDraft2026!';
const DEMO_EMAILS = ['nora.vega@bodydraft.demo', 'ruben.salas@bodydraft.demo'];

function readEnv() {
  const out = {};
  for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
const URL_BASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !ANON) {
  console.error('faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

async function signIn(email) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description || body.msg || JSON.stringify(body));
  return body.access_token;
}

async function get(path, token) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: ANON, authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function main() {
  let failed = false;

  // Basta con una sesion: la policy de `profiles` deja a cualquier
  // usuario logueado ver a CUALQUIER tatuador, que es justo lo que hace
  // la pantalla de Artistas.
  let token;
  try {
    token = await signIn(DEMO_EMAILS[0]);
    console.log(`inicio de sesion como ${DEMO_EMAILS[0]}: OK`);
  } catch (e) {
    console.error(`inicio de sesion como ${DEMO_EMAILS[0]}: FALLO — ${e.message}`);
    console.error('  ¿se aplico 20261002130000_seed_demo_artists.sql en el SQL Editor?');
    return 1;
  }

  const artists = await get(
    'profiles?role=eq.artist&select=id,name,specialty,location,rating,portfolio_image_urls',
    token
  );
  console.log(`\ntatuadores visibles para la app: ${artists.length}`);

  for (const a of artists) {
    const designs = await get(`designs?artist_id=eq.${a.id}&select=title,style`, token);
    const portfolio = a.portfolio_image_urls?.length ?? 0;
    const ok = Boolean(a.name && a.specialty) && portfolio > 0 && designs.length > 0;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? 'OK  ' : 'MAL '} ${a.name} — ${a.specialty || '(sin especialidad)'} · ` +
        `${a.location || '(sin ciudad)'} · ${portfolio} imagenes de portafolio · ${designs.length} trabajos`
    );
    for (const d of designs) console.log(`         · ${d.title} (${d.style})`);
  }

  const missing = ['Nora Vega', 'Ruben Salas'].filter((name) => !artists.some((a) => a.name === name));
  if (missing.length) {
    failed = true;
    console.error(`\nFALTAN tatuadores de demostracion: ${missing.join(', ')}`);
  }

  // Una imagen rota en el portafolio no la detecta ninguna query: hay
  // que pedirla.
  const firstImage = artists[0]?.portfolio_image_urls?.[0];
  if (firstImage) {
    const res = await fetch(firstImage);
    console.log(`\nprimera imagen de portafolio: HTTP ${res.status} (${firstImage})`);
    if (!res.ok) failed = true;
  }

  console.log(failed ? '\nRESULTADO: hay algo mal (ver arriba)' : '\nRESULTADO: todo OK');
  return failed ? 1 : 0;
}

// `process.exitCode` y no `process.exit()`: en Windows, salir de golpe
// con un fetch todavia en vuelo dispara un assert de libuv.
process.exitCode = await main();
