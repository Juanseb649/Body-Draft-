/**
 * Edge Function `ai`: la UNICA puerta de la app hacia el proveedor de
 * IA (OpenAI o Gemini). La clave vive en los secrets de Supabase y
 * nunca llega al telefono; cada cuenta tiene una cuota diaria.
 *
 * Secrets que usa (supabase secrets set ...):
 *   OPENAI_API_KEY o GEMINI_API_KEY   la clave del proveedor
 *   AI_PROVIDER        (opcional) 'openai' | 'gemini'; sin el, el primero con clave
 *   AI_DAILY_LIMIT     (opcional) usos de IA por cuenta y dia, por defecto 10
 *   AI_IMAGE_QUALITY   (opcional, OpenAI) 'low' | 'medium' | 'high', por defecto 'medium'
 * SUPABASE_URL y SUPABASE_ANON_KEY los pone Supabase solo.
 *
 * Desplegar:  npx supabase functions deploy ai
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { createHandler, QuotaExceededError } from './handler.ts';
import { providerFromEnv } from './providers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const DAILY_LIMIT = Math.max(1, Number(Deno.env.get('AI_DAILY_LIMIT') ?? '10') || 10);

Deno.serve(
  createHandler({
    dailyLimit: DAILY_LIMIT,
    provider: providerFromEnv(Deno.env.toObject()),
    async authenticate(request) {
      const header = request.headers.get('Authorization') ?? '';
      if (!header.startsWith('Bearer ')) return null;
      // Cliente con el JWT del usuario: la cuota (RPC) corre como el,
      // con su auth.uid(), nunca con privilegios de servicio.
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: header } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.getUser(header.slice('Bearer '.length));
      if (error || !data.user) return null;

      return {
        userId: data.user.id,
        quota: {
          async consume(limit) {
            const { data: used, error: rpcError } = await client.rpc('consume_ai_quota', { daily_limit: limit });
            if (rpcError) {
              if (rpcError.message.includes('ai_quota_exceeded')) throw new QuotaExceededError(limit);
              throw new Error(rpcError.message);
            }
            return used as number;
          },
          async refund() {
            await client.rpc('refund_ai_quota');
          },
        },
      };
    },
  }),
);
