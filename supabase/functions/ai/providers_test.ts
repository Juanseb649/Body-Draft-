// Tests de los proveedores con un fetch falso: que peticion arman y
// como traducen las respuestas y los errores.
// Correr:  npx deno test supabase/functions/ai/
import { assertEquals, assertMatch, assertRejects } from 'jsr:@std/assert@1';

import { geminiProvider, openAiProvider, ProviderError, providerFromEnv } from './providers.ts';

const IMG = 'data:image/png;base64,iVBORw0KGgo=';

function recordingFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(response.clone());
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const okOpenAi = () => new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] }), { status: 200 });

Deno.test('OpenAI compose: foto primero, boceto despues, calidad fija y la clave en el header', async () => {
  const { calls, fetchImpl } = recordingFetch(okOpenAi());
  const out = await openAiProvider('sk-test', { fetchImpl }).compose(IMG, IMG, 'Antebrazo');
  assertEquals(out, 'data:image/png;base64,QUJD');
  assertEquals(calls[0].url, 'https://api.openai.com/v1/images/edits');
  assertEquals((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer sk-test');
  const form = calls[0].init.body as FormData;
  assertEquals(form.get('quality'), 'medium');
  const images = form.getAll('image[]') as File[];
  assertEquals(images.map((f) => f.name), ['foto.jpg', 'boceto.png']);
  assertMatch(String(form.get('prompt')), /Antebrazo/);
});

Deno.test('OpenAI sin saldo (429) se traduce a un mensaje en español', async () => {
  const { fetchImpl } = recordingFetch(new Response('{"error":{"message":"quota"}}', { status: 429 }));
  const error = await assertRejects(() => openAiProvider('sk', { fetchImpl }).generate('rosa'), ProviderError);
  assertMatch(error.message, /saturado o sin saldo/);
});

Deno.test('Gemini manda las imagenes como inlineData y devuelve la imagen', async () => {
  const { calls, fetchImpl } = recordingFetch(
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'WFla' } }] } }] })),
  );
  const out = await geminiProvider('g-key', { fetchImpl }).removeBackground(IMG);
  assertEquals(out, 'data:image/png;base64,WFla');
  const body = JSON.parse(String(calls[0].init.body));
  assertEquals(body.contents[0].parts[0].inlineData.mimeType, 'image/png');
  assertEquals((calls[0].init.headers as Record<string, string>)['x-goog-api-key'], 'g-key');
});

Deno.test('providerFromEnv: respeta AI_PROVIDER y sin clave no hay proveedor', () => {
  assertEquals(providerFromEnv({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' })?.name, 'gemini');
  assertEquals(providerFromEnv({ OPENAI_API_KEY: 'o' })?.name, 'openai');
  assertEquals(providerFromEnv({ AI_PROVIDER: 'openai' }), null);
  assertEquals(providerFromEnv({}), null);
});
