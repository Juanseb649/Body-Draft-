/**
 * La logica de la Edge Function `ai`, sin dependencias de red: recibe
 * todo lo que necesita (autenticar, cuota, proveedor) inyectado, asi se
 * prueba con dobles en handler_test.ts. index.ts la conecta con
 * Supabase y con el proveedor real.
 *
 * Orden de cada peticion:
 *   1. Solo POST (y OPTIONS para CORS en web).
 *   2. Usuario autenticado por su JWT de Supabase, o 401.
 *   3. Cuerpo valido (operacion conocida, imagenes como data URI, textos
 *      acotados), o 400.
 *   4. Una unidad de la cuota diaria de ESA cuenta, o 429.
 *   5. El proveedor. Si falla, se devuelve la unidad de cuota.
 */
import { type AiProvider, ProviderError } from './providers.ts';

export class QuotaExceededError extends Error {
  constructor(readonly limit: number) {
    super('ai_quota_exceeded');
  }
}

export interface QuotaClient {
  /** Descuenta una unidad; lanza QuotaExceededError si no queda. Devuelve lo usado. */
  consume(limit: number): Promise<number>;
  /** Devuelve la unidad (la llamada al proveedor fallo). */
  refund(): Promise<void>;
}

export interface HandlerDeps {
  dailyLimit: number;
  provider: AiProvider | null;
  /** El usuario del JWT de la peticion, con su cuota; null si no hay sesion valida. */
  authenticate(request: Request): Promise<{ userId: string; quota: QuotaClient } | null>;
}

export type AiRequest =
  | { op: 'generate'; prompt: string; style?: string }
  | { op: 'removeBackground'; image: string }
  | { op: 'compose'; photo: string; design: string; zone: string };

/** Unos 15 MB de base64: una foto de camara a calidad 0,7 cabe de sobra. */
export const MAX_IMAGE_CHARS = 15_000_000;
const MAX_TEXT = 1000;
const MAX_ZONE = 60;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

const isImage = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_IMAGE_CHARS && /^data:image\/[a-z0-9.+-]+;base64,/i.test(v);
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** Valida el cuerpo; devuelve el pedido o el motivo del rechazo. */
export function parseRequest(body: unknown): AiRequest | string {
  if (!body || typeof body !== 'object') return 'Cuerpo vacío o inválido.';
  const b = body as Record<string, unknown>;
  switch (b.op) {
    case 'generate':
      if (!isText(b.prompt, MAX_TEXT)) return 'Falta la descripción del diseño.';
      if (b.style !== undefined && !isText(b.style, 80)) return 'El estilo no es válido.';
      return { op: 'generate', prompt: b.prompt.trim(), style: (b.style as string | undefined)?.trim() };
    case 'removeBackground':
      if (!isImage(b.image)) return 'Falta la imagen del boceto.';
      return { op: 'removeBackground', image: b.image };
    case 'compose':
      if (!isImage(b.photo)) return 'Falta la foto.';
      if (!isImage(b.design)) return 'Falta la imagen del diseño.';
      if (!isText(b.zone, MAX_ZONE)) return 'Falta la zona del cuerpo.';
      return { op: 'compose', photo: b.photo, design: b.design, zone: b.zone.trim() };
    default:
      return 'Operación desconocida.';
  }
}

export function createHandler(deps: HandlerDeps): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed', message: 'Solo POST.' });

    const user = await deps.authenticate(request);
    if (!user) return json(401, { error: 'unauthorized', message: 'Inicia sesión para usar la IA.' });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'bad_request', message: 'El cuerpo no es JSON.' });
    }
    const parsed = parseRequest(body);
    if (typeof parsed === 'string') return json(400, { error: 'bad_request', message: parsed });

    if (!deps.provider) {
      return json(503, { error: 'not_configured', message: 'La IA no está configurada en el servidor.' });
    }

    let used: number;
    try {
      used = await user.quota.consume(deps.dailyLimit);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        return json(429, {
          error: 'quota_exceeded',
          limit: e.limit,
          message: `Usaste tus ${e.limit} usos de IA de hoy. Vuelve a intentarlo mañana.`,
        });
      }
      throw e;
    }

    try {
      const image =
        parsed.op === 'generate'
          ? await deps.provider.generate(parsed.prompt, parsed.style)
          : parsed.op === 'removeBackground'
            ? await deps.provider.removeBackground(parsed.image)
            : await deps.provider.compose(parsed.photo, parsed.design, parsed.zone);
      return json(200, { image, used, limit: deps.dailyLimit });
    } catch (e) {
      // Un fallo del proveedor no le gasta la cuota al usuario.
      await user.quota.refund().catch(() => {});
      if (e instanceof ProviderError) return json(e.status, { error: 'provider_error', message: e.message });
      return json(502, { error: 'provider_error', message: 'El servicio de IA falló. Intenta de nuevo.' });
    }
  };
}
