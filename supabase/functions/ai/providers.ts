/**
 * Proveedores de IA para la Edge Function `ai`. Corren en el servidor
 * (Deno), con la clave en los secrets de Supabase: la app ya no la
 * tiene ni la ve.
 *
 * Las tres operaciones que usa la app devuelven un data URI de imagen:
 * - generate: un diseño desde una descripcion.
 * - removeBackground: el boceto recortado sobre fondo transparente.
 * - compose: la foto con el tatuaje integrado en la piel.
 */

export interface AiProvider {
  name: 'openai' | 'gemini';
  generate(prompt: string, style?: string): Promise<string>;
  removeBackground(image: string): Promise<string>;
  compose(photo: string, design: string, zone: string): Promise<string>;
}

/** Error del proveedor, con un mensaje que se puede mostrar al usuario. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

const REMOVE_BG_PROMPT =
  'Recorta este diseño de tatuaje dejando SOLO la tinta sobre fondo completamente transparente. ' +
  'Quita el papel, la mesa, las sombras y cualquier reflejo. No lo redibujes ni cambies el trazo ' +
  'o las proporciones: el mismo diseño, recortado.';

export function composePrompt(zone: string): string {
  return (
    `La primera imagen es una foto real. La segunda es un diseño de tatuaje. Aplica el tatuaje ` +
    `sobre la piel en la zona: ${zone}. Tiene que verse tatuado de verdad: siguiendo la curvatura ` +
    'del cuerpo, con la misma luz, sombras y tono de piel que el resto de la foto, y con la tinta ' +
    'ligeramente absorbida por la piel, no como una calcomanía plana. Respeta el diseño: mismo ' +
    'trazo, mismas proporciones, mismo motivo. No lo redibujes. No cambies nada más de la foto: ' +
    'ni la pose, ni la ropa, ni el fondo, ni la cara.'
  );
}

function generatePrompt(prompt: string, style?: string): string {
  return style
    ? `${prompt}. Estilo: ${style}. Diseño de tatuaje en trazo limpio sobre fondo transparente.`
    : `${prompt}. Diseño de tatuaje en trazo limpio sobre fondo transparente.`;
}

/** "data:image/png;base64,AAAA" → { mimeType, data }. */
export function parseDataUri(uri: string): { mimeType: string; data: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(uri);
  if (!match) throw new ProviderError('La imagen no llegó en un formato válido.', 400);
  return { mimeType: match[1], data: match[2] };
}

function dataUriToBlob(uri: string): Blob {
  const { mimeType, data } = parseDataUri(uri);
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

async function readError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body;
  } catch {
    return body;
  }
}

/** Mensajes en español: lo que vera el usuario si el proveedor falla. */
function providerFailure(status: number, detail: string): ProviderError {
  if (status === 429) return new ProviderError('El servicio de IA está saturado o sin saldo. Intenta más tarde.', 503);
  if (status === 401 || status === 403) {
    return new ProviderError('El servicio de IA no está bien configurado en el servidor.', 502);
  }
  if (status === 400) {
    return new ProviderError(`El servicio de IA rechazó la imagen (suele ser por sus políticas). ${detail}`, 422);
  }
  return new ProviderError(`El servicio de IA falló (${status}).`, 502);
}

// ── OpenAI ───────────────────────────────────────────────────────────

export function openAiProvider(
  apiKey: string,
  { fetchImpl = fetch, model = 'gpt-image-1', quality = 'medium' }: { fetchImpl?: Fetch; model?: string; quality?: string } = {},
): AiProvider {
  const base = 'https://api.openai.com/v1';
  const auth = { Authorization: `Bearer ${apiKey}` };

  async function firstImage(response: Response): Promise<string> {
    if (!response.ok) throw providerFailure(response.status, await readError(response));
    const body = (await response.json()) as { data?: { b64_json?: string }[] };
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) throw new ProviderError('El servicio de IA no devolvió ninguna imagen.', 502);
    return `data:image/png;base64,${b64}`;
  }

  async function edit(images: { uri: string; name: string }[], prompt: string, extra: Record<string, string> = {}) {
    const form = new FormData();
    form.append('model', model);
    // Calidad fija (no "auto"): acota lo que cuesta cada llamada.
    form.append('quality', quality);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    for (const image of images) form.append('image[]', dataUriToBlob(image.uri), image.name);
    form.append('prompt', prompt);
    return firstImage(await fetchImpl(`${base}/images/edits`, { method: 'POST', headers: auth, body: form }));
  }

  return {
    name: 'openai',
    async generate(prompt, style) {
      const response = await fetchImpl(`${base}/images/generations`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          quality,
          prompt: generatePrompt(prompt, style),
          n: 1,
          size: '1024x1024',
          background: 'transparent',
        }),
      });
      return firstImage(response);
    },
    removeBackground(image) {
      return edit([{ uri: image, name: 'boceto.png' }], REMOVE_BG_PROMPT, { background: 'transparent' });
    },
    compose(photo, design, zone) {
      // El orden importa: la foto primero es la imagen a editar.
      return edit(
        [
          { uri: photo, name: 'foto.jpg' },
          { uri: design, name: 'boceto.png' },
        ],
        composePrompt(zone),
      );
    },
  };
}

// ── Gemini ───────────────────────────────────────────────────────────

export function geminiProvider(
  apiKey: string,
  { fetchImpl = fetch, model = 'gemini-3.1-flash-image' }: { fetchImpl?: Fetch; model?: string } = {},
): AiProvider {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  async function call(parts: unknown[]): Promise<string> {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
    });
    if (!response.ok) throw providerFailure(response.status, await readError(response));
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] } }[];
    };
    const out = body.candidates?.[0]?.content?.parts ?? [];
    const image = out.find((p) => p.inlineData)?.inlineData;
    if (!image) {
      const text = out.find((p) => p.text)?.text;
      throw new ProviderError(text ? `El servicio de IA no devolvió imagen: ${text}` : 'El servicio de IA no devolvió ninguna imagen.', 502);
    }
    return `data:${image.mimeType};base64,${image.data}`;
  }

  const inline = (uri: string) => ({ inlineData: parseDataUri(uri) });

  return {
    name: 'gemini',
    generate: (prompt, style) => call([{ text: generatePrompt(prompt, style) }]),
    removeBackground: (image) => call([inline(image), { text: `${REMOVE_BG_PROMPT} Devuelve un PNG con canal alfa.` }]),
    compose: (photo, design, zone) => call([inline(photo), inline(design), { text: composePrompt(zone) }]),
  };
}

/** Elige el proveedor por los secrets: AI_PROVIDER, o el primero con clave. */
export function providerFromEnv(env: Record<string, string | undefined>, fetchImpl: Fetch = fetch): AiProvider | null {
  const requested = env.AI_PROVIDER?.trim().toLowerCase();
  const openai = env.OPENAI_API_KEY?.trim();
  const gemini = env.GEMINI_API_KEY?.trim();
  const quality = env.AI_IMAGE_QUALITY?.trim() || 'medium';
  if (requested === 'openai') return openai ? openAiProvider(openai, { fetchImpl, quality }) : null;
  if (requested === 'gemini') return gemini ? geminiProvider(gemini, { fetchImpl }) : null;
  if (openai) return openAiProvider(openai, { fetchImpl, quality });
  if (gemini) return geminiProvider(gemini, { fetchImpl });
  return null;
}
