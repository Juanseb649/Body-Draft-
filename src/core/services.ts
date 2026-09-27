import { AppointmentRepository } from '../data/appointmentRepository';
import { ArtistRepository } from '../data/artistRepository';
import { DesignRepository } from '../data/designRepository';
import type { AIService } from '../services/aiService';
import { BodyModelServiceImpl } from '../services/bodyModelService';
import { GeminiAIService } from '../services/geminiAiService';
import { InMemoryStorageService } from '../services/inMemoryStorageService';
import type { StorageService } from '../services/storageService';

/**
 * Cableado de dependencias (inyeccion) de toda la app: un unico lugar
 * donde se decide que implementacion concreta usa cada interfaz de
 * services/ y data/. Los Controllers (stores) solo importan las
 * instancias de aqui, nunca instancian servicios directamente.
 *
 * TODO: sustituir InMemoryStorageService por una implementacion real
 * con expo-sqlite (ver services/storageService.ts).
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

export const storageService: StorageService = new InMemoryStorageService();
export const aiService: AIService = new GeminiAIService(GEMINI_API_KEY);
export const bodyModelService = new BodyModelServiceImpl();

export const designRepository = new DesignRepository(storageService, aiService);
export const artistRepository = new ArtistRepository();
export const appointmentRepository = new AppointmentRepository(storageService);
