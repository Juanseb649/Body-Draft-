import { AppointmentRepository } from '../data/appointmentRepository';
import { ArtistRepository } from '../data/artistRepository';
import { DesignRepository } from '../data/designRepository';
import type { AIService } from '../services/aiService';
import type { AuthService } from '../services/authService';
import { SupabaseAuthService } from '../services/authService';
import { BodyModelServiceImpl } from '../services/bodyModelService';
import { createAiService } from '../services/aiProvider';
import type { ImageUploadService } from '../services/imageUploadService';
import { SupabaseImageUploadService } from '../services/imageUploadService';
import { SqliteStorageService } from '../services/sqliteStorageService';
import type { StorageService } from '../services/storageService';

/**
 * Cableado de dependencias (inyeccion) de toda la app: un unico lugar
 * donde se decide que implementacion concreta usa cada interfaz de
 * services/ y data/. Los Controllers (stores) solo importan las
 * instancias de aqui, nunca instancian servicios directamente.
 *
 * `ArtistRepository` y `AppointmentRepository` leen/escriben Supabase
 * directamente (no `storageService`): un tatuador y su catalogo, y una
 * cita entre un cliente y un tatuador, son datos que tienen que verse
 * desde DOS cuentas distintas — no pueden vivir solo en el storage local
 * de una de ellas. Requiere haber aplicado las migraciones de
 * supabase/migrations/ en el proyecto de Supabase (ver supabase/README.md).
 */

export type { ArtistFeedItem, NewArtistWork } from '../data/designRepository';

/**
 * El proveedor de IA no esta fijado en el codigo: se elige por entorno
 * (ver services/aiProvider.ts). Con EXPO_PUBLIC_AI_PROVIDER se fuerza
 * uno; sin el, se usa el primero que tenga clave.
 */
const aiConfig = {
  provider: process.env.EXPO_PUBLIC_AI_PROVIDER,
  openAiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  geminiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
};

export const storageService: StorageService = new SqliteStorageService();
export const aiService: AIService = createAiService(aiConfig);
export const bodyModelService = new BodyModelServiceImpl();
export const authService: AuthService = new SupabaseAuthService();
export const imageUploadService: ImageUploadService = new SupabaseImageUploadService();

export const designRepository = new DesignRepository(storageService, aiService, imageUploadService);
export const artistRepository = new ArtistRepository();
export const appointmentRepository = new AppointmentRepository();
