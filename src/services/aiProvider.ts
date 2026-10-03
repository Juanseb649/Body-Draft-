import type { AIService } from './aiService';
import { GeminiAIService } from './geminiAiService';
import { OpenAiService } from './openAiService';

export const AI_PROVIDERS = ['openai', 'gemini'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface AiProviderConfig {
  /** Fuerza un proveedor. Sin esto se elige por las claves que haya. */
  provider?: string;
  openAiKey?: string;
  geminiKey?: string;
}

/**
 * Decide que proveedor de IA usa la app.
 *
 * La app no depende de ninguno en concreto: `AIService` (ver
 * aiService.ts) describe lo que necesita —generar un diseño, recortar
 * un fondo, componer un tatuaje sobre una foto— y cada proveedor lo
 * implementa a su manera. Los Controllers hablan siempre con esa
 * interfaz, asi que cambiar de proveedor no toca ni una pantalla.
 *
 * Se elige asi:
 *   1. `EXPO_PUBLIC_AI_PROVIDER`, si esta puesto.
 *   2. Si no, el primero que tenga clave, en el orden de AI_PROVIDERS.
 *
 * Sin ninguna clave devuelve una implementacion que falla con un
 * mensaje claro. Es mejor que dejar pasar una clave vacia y que el
 * error salga mucho despues como un 401 del servidor.
 */
export function selectAiProvider(config: AiProviderConfig): AiProvider | null {
  const requested = config.provider?.trim().toLowerCase();
  if (requested) {
    const known = AI_PROVIDERS.find((p) => p === requested);
    if (!known) throw new Error(`EXPO_PUBLIC_AI_PROVIDER="${config.provider}" no existe. Usa: ${AI_PROVIDERS.join(', ')}.`);
    if (!keyFor(known, config)) throw new Error(`Falta la API key de ${known}: pon ${ENV_KEY[known]} en tu .env.`);
    return known;
  }

  return AI_PROVIDERS.find((p) => Boolean(keyFor(p, config))) ?? null;
}

export function createAiService(config: AiProviderConfig): AIService {
  const provider = selectAiProvider(config);
  if (!provider) return new UnconfiguredAiService();

  const key = keyFor(provider, config) as string;
  return provider === 'openai' ? new OpenAiService(key) : new GeminiAIService(key);
}

const ENV_KEY: Record<AiProvider, string> = {
  openai: 'EXPO_PUBLIC_OPENAI_API_KEY',
  gemini: 'EXPO_PUBLIC_GEMINI_API_KEY',
};

function keyFor(provider: AiProvider, config: AiProviderConfig): string | undefined {
  const key = provider === 'openai' ? config.openAiKey : config.geminiKey;
  return key?.trim() ? key.trim() : undefined;
}

/**
 * Lo que se usa cuando no hay ninguna clave configurada: falla
 * diciendo exactamente que falta, en vez de mandar una peticion vacia.
 */
class UnconfiguredAiService implements AIService {
  /**
   * Rechaza la promesa en vez de lanzar de forma sincrona. La interfaz
   * promete `Promise`, y quien la use con `.catch()` en lugar de
   * `await` dentro de un try no llegaria a atrapar un throw sincrono:
   * se le caeria la app.
   */
  private fail(): Promise<never> {
    return Promise.reject(
      new Error(
        'No hay ninguna IA configurada. Añade a tu .env una de estas claves: ' +
          `${ENV_KEY.openai} o ${ENV_KEY.gemini}.`
      )
    );
  }

  generateFromDescription(): Promise<never> {
    return this.fail();
  }
  analyzeReferenceImage(): Promise<never> {
    return this.fail();
  }
  generateVariations(): Promise<never> {
    return this.fail();
  }
  adaptToStyle(): Promise<never> {
    return this.fail();
  }
  removeBackground(): Promise<never> {
    return this.fail();
  }
  composeOnPhoto(): Promise<never> {
    return this.fail();
  }
}
