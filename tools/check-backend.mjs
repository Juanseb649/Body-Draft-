/**
 * Estado del backend (Supabase) visto desde la app: que servicios
 * responden y que tablas/funciones existen, sin escribir nada.
 *
 * Uso:   node tools/check-backend.mjs
 *        node tools/check-backend.mjs --demo   (ademas inicia sesion con
 *        una cuenta de demostracion sembrada y lee como un usuario real)
 *
 * Sin --demo solo usa la anon key, que es publica por diseño: asi se ve
 * lo mismo que ve alguien sin sesion, y la RLS deberia devolverle
 * listas vacias (o 401), nunca datos.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = { email: 'nora.vega@bodydraft.demo', password: 'BodyDraft2026!' };

/** Lo que la app lee o escribe (ver src/data/*.ts). */
const TABLES = ['profiles', 'designs', 'appointments', 'design_likes', 'design_comments'];
const STORAGE_BUCKETS = ['portfolio', 'avatars'];

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

const results = [];
const report = (area, name, ok, detail) => results.push({ area, name, ok, detail });

async function call(path, { token, method = 'GET', body } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        apikey: ANON,
        authorization: `Bearer ${token ?? ANON}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // no es JSON
    }
    return { status: res.status, json, ms: Date.now() - started };
  } catch (e) {
    return { status: 0, json: { message: e.message }, ms: Date.now() - started };
  }
}

/** Una tabla existe si PostgREST no responde "no encuentro la tabla". */
function tableVerdict(r) {
  if (r.status === 0) return [false, `sin conexion: ${r.json?.message}`];
  if (r.json?.code === 'PGRST205' || r.status === 404) return [false, 'NO EXISTE (falta aplicar su migracion)'];
  if (r.status === 200) return [true, `responde 200 (${Array.isArray(r.json) ? r.json.length : '?'} filas visibles) en ${r.ms} ms`];
  if (r.status === 401 || r.status === 403) return [true, `existe; RLS/permiso niega sin sesion (${r.status})`];
  return [false, `respuesta inesperada ${r.status}: ${JSON.stringify(r.json).slice(0, 120)}`];
}

async function main() {
  const auth = await call('/auth/v1/health');
  report('Auth', 'GET /auth/v1/health', auth.status === 200, `${auth.status} en ${auth.ms} ms`);

  const settings = await call('/auth/v1/settings');
  report(
    'Auth',
    'registro por correo',
    settings.status === 200 && settings.json?.external?.email === true,
    settings.status === 200 ? `email ${settings.json?.external?.email ? 'activo' : 'desactivado'}, confirmacion ${settings.json?.mailer_autoconfirm ? 'automatica' : 'por correo'}` : `${settings.status}`,
  );

  for (const table of TABLES) {
    const r = await call(`/rest/v1/${table}?select=*&limit=1`);
    const [ok, detail] = tableVerdict(r);
    // Sin sesion, cualquier fila visible de una tabla privada es una fuga.
    const leak = ok && r.status === 200 && Array.isArray(r.json) && r.json.length > 0 && table !== 'designs';
    report('REST (anon)', `/rest/v1/${table}`, ok && !leak, leak ? `ATENCION: devuelve filas sin sesion` : detail);
  }

  // Columnas que agregan migraciones posteriores a la tabla.
  const COLUMNS = [
    ['appointments', 'design_id', '20261018120000_design_likes_comments.sql'],
    ['profiles', 'avatar_url', '20261018200000_profile_names_and_avatars.sql'],
    ['design_comments', 'author_avatar_url', '20261018200000_profile_names_and_avatars.sql'],
  ];
  for (const [table, column, migration] of COLUMNS) {
    const r = await call(`/rest/v1/${table}?select=${column}&limit=1`);
    report('REST (anon)', `${table}.${column}`, r.status === 200, r.status === 200 ? 'existe' : `NO EXISTE (${migration})`);
  }

  // Funcion que se menciono para crear citas; la app hoy no la usa.
  const rpc = await call('/rest/v1/rpc/book_appointment', { method: 'POST', body: {} });
  const rpcExists = !(rpc.json?.code === 'PGRST202' || rpc.status === 404);
  report('RPC', 'book_appointment', true, rpcExists ? `existe (${rpc.status} con argumentos vacios)` : 'no existe en esta base (la app inserta en appointments con RLS)');

  for (const bucket of STORAGE_BUCKETS) {
    const r = await call(`/storage/v1/object/list/${bucket}`, { method: 'POST', body: { prefix: '', limit: 1 } });
    const ok = r.status === 200 || r.status === 400 || r.status === 401 || r.status === 403;
    // Sin sesion, listar un bucket que no existe tambien puede dar 200 con
    // una lista vacia: esto prueba que Storage responde, no que el bucket
    // exista. Para eso, --demo o el dashboard.
    report('Storage', `bucket ${bucket}`, ok && r.json?.error !== 'Bucket not found', `${r.status}${r.json?.message ? ` · ${r.json.message}` : ''} (responde; sin sesion no confirma que exista)`);
  }

  if (process.argv.includes('--demo')) {
    const login = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: DEMO });
    const token = login.json?.access_token;
    report('Auth', `login ${DEMO.email}`, Boolean(token), token ? `${login.status} en ${login.ms} ms` : `${login.status} ${login.json?.error_description ?? ''}`);
    if (token) {
      for (const table of TABLES) {
        const r = await call(`/rest/v1/${table}?select=*&limit=5`, { token });
        const [ok, detail] = tableVerdict(r);
        report('REST (sesion)', `/rest/v1/${table}`, ok, detail);
      }
    }
  }

  let currentArea = '';
  for (const r of results) {
    if (r.area !== currentArea) {
      currentArea = r.area;
      console.log(`\n${currentArea}`);
    }
    console.log(`  ${r.ok ? 'OK  ' : 'FALLA'}  ${r.name.padEnd(30)} ${r.detail}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed === 0 ? 'Todo responde.' : `${failed} punto(s) con problema.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
