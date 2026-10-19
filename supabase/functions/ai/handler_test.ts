// Tests de la Edge Function `ai` (sin red: proveedor y cuota son dobles).
// Correr:  npx deno test supabase/functions/ai/
import { assertEquals, assertMatch } from 'jsr:@std/assert@1';

import { createHandler, type HandlerDeps, parseRequest, QuotaExceededError } from './handler.ts';
import { type AiProvider, ProviderError } from './providers.ts';

const IMG = 'data:image/png;base64,iVBORw0KGgo=';

function fakeProvider(overrides: Partial<AiProvider> = {}): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: 'openai',
    calls,
    generate: (prompt) => {
      calls.push(`generate:${prompt}`);
      return Promise.resolve(IMG);
    },
    removeBackground: () => {
      calls.push('removeBackground');
      return Promise.resolve(IMG);
    },
    compose: (_p, _d, zone) => {
      calls.push(`compose:${zone}`);
      return Promise.resolve(IMG);
    },
    ...overrides,
  };
}

function fakeQuota(limitReached = false) {
  const state = { used: 0, refunds: 0 };
  return {
    state,
    client: {
      consume(limit: number) {
        if (limitReached || state.used >= limit) return Promise.reject(new QuotaExceededError(limit));
        state.used += 1;
        return Promise.resolve(state.used);
      },
      refund() {
        state.refunds += 1;
        state.used -= 1;
        return Promise.resolve();
      },
    },
  };
}

function handlerWith(overrides: Partial<HandlerDeps> = {}, quota = fakeQuota()) {
  const provider = fakeProvider();
  const handler = createHandler({
    dailyLimit: 2,
    provider,
    authenticate: (req) =>
      Promise.resolve(req.headers.get('Authorization') === 'Bearer ok' ? { userId: 'u1', quota: quota.client } : null),
    ...overrides,
  });
  return { handler, provider, quota };
}

const post = (body: unknown, token = 'ok') =>
  new Request('https://x.supabase.co/functions/v1/ai', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

Deno.test('sin sesion valida responde 401 y no llama al proveedor', async () => {
  const { handler, provider } = handlerWith();
  const res = await handler(post({ op: 'generate', prompt: 'rosa' }, 'falso'));
  assertEquals(res.status, 401);
  assertEquals(provider.calls.length, 0);
});

Deno.test('compone la foto y descuenta una unidad de cuota', async () => {
  const { handler, provider, quota } = handlerWith();
  const res = await handler(post({ op: 'compose', photo: IMG, design: IMG, zone: 'Antebrazo' }));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.image, IMG);
  assertEquals(body.used, 1);
  assertEquals(body.limit, 2);
  assertEquals(provider.calls, ['compose:Antebrazo']);
  assertEquals(quota.state.used, 1);
});

Deno.test('al pasar la cuota diaria responde 429 con mensaje, sin llamar al proveedor', async () => {
  const { handler, provider } = handlerWith({}, fakeQuota(true));
  const res = await handler(post({ op: 'removeBackground', image: IMG }));
  assertEquals(res.status, 429);
  const body = await res.json();
  assertEquals(body.error, 'quota_exceeded');
  assertMatch(body.message, /usos de IA de hoy/);
  assertEquals(provider.calls.length, 0);
});

Deno.test('si el proveedor falla, devuelve la unidad de cuota', async () => {
  const quota = fakeQuota();
  const { handler } = handlerWith(
    {
      provider: fakeProvider({
        compose: () => Promise.reject(new ProviderError('El servicio de IA está saturado o sin saldo.', 503)),
      }),
    },
    quota,
  );
  const res = await handler(post({ op: 'compose', photo: IMG, design: IMG, zone: 'Pecho' }));
  assertEquals(res.status, 503);
  assertEquals(quota.state.refunds, 1);
  assertEquals(quota.state.used, 0);
});

Deno.test('sin clave en los secrets responde 503 y no gasta cuota', async () => {
  const quota = fakeQuota();
  const { handler } = handlerWith({ provider: null }, quota);
  const res = await handler(post({ op: 'generate', prompt: 'koi' }));
  assertEquals(res.status, 503);
  assertEquals(quota.state.used, 0);
});

Deno.test('cuerpo invalido: 400, sin gastar cuota', async () => {
  const quota = fakeQuota();
  const { handler } = handlerWith({}, quota);
  for (const body of [{ op: 'borrar-todo' }, { op: 'compose', photo: 'file:///x.jpg', design: IMG, zone: 'x' }, {}]) {
    const res = await handler(post(body));
    assertEquals(res.status, 400);
  }
  assertEquals(quota.state.used, 0);
});

Deno.test('OPTIONS responde para CORS (la app en web)', async () => {
  const { handler } = handlerWith();
  const res = await handler(new Request('https://x/functions/v1/ai', { method: 'OPTIONS' }));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('parseRequest acota los textos', () => {
  assertEquals(typeof parseRequest({ op: 'generate', prompt: 'a'.repeat(1001) }), 'string');
  assertEquals(typeof parseRequest({ op: 'compose', photo: IMG, design: IMG, zone: 'z'.repeat(61) }), 'string');
  assertEquals(parseRequest({ op: 'generate', prompt: '  rosa  ', style: ' japones ' }), {
    op: 'generate',
    prompt: 'rosa',
    style: 'japones',
  });
});
