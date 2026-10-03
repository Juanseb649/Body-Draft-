import Storage from 'expo-sqlite/kv-store';

import { defaultPlacement } from '../models/placement';
import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';
import type { StorageService } from './storageService';

const KEYS = {
  designs: 'bodydraft.designs',
  proposals: 'bodydraft.proposals',
} as const;

const now = () => new Date();
const daysAgo = (days: number) => new Date(now().getTime() - days * 86_400_000).toISOString();

/** Datos de ejemplo para que la app no se vea vacia en el primer arranque. */
const SEED_DESIGNS: TattooDesign[] = [
  {
    id: 'design-1',
    ownerId: 'current-user',
    title: 'Serpiente con flores',
    imageUrl: 'https://picsum.photos/seed/bodydraft-serpiente/400',
    source: 'aiGenerated',
    style: 'Japones',
    createdAt: daysAgo(2),
  },
];

const SEED_PROPOSALS: TattooProposal[] = [
  {
    id: 'proposal-1',
    userId: 'current-user',
    designId: 'design-1',
    bodyZone: 'forearm',
    silhouette: 'masculine',
    placement: { ...defaultPlacement(), scale: 1.1 },
    status: 'saved',
    createdAt: daysAgo(1),
  },
];

async function readAll<T>(key: string): Promise<T[]> {
  const raw = await Storage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

async function writeAll<T>(key: string, items: T[]): Promise<void> {
  await Storage.setItem(key, JSON.stringify(items));
}

/** Si la coleccion nunca se escribio, la deja sembrada con datos de ejemplo. */
async function seedIfEmpty<T>(key: string, seed: T[]): Promise<void> {
  const existing = await Storage.getItem(key);
  if (existing === null) await writeAll(key, seed);
}

/**
 * Implementacion real de StorageService sobre `expo-sqlite/kv-store`
 * (SQLite bajo una API tipo AsyncStorage, incluida en Expo Go). A
 * diferencia de la version anterior en memoria, estos datos sobreviven a
 * cerrar la app. Solo guarda disenos/propuestas: son datos de un unico
 * usuario, sin necesidad de verse desde otra cuenta (las citas si la
 * necesitan — ver data/appointmentRepository.ts, que habla con Supabase
 * directamente).
 *
 * Cada coleccion se guarda como un unico array JSON bajo una key fija en
 * vez de una tabla SQL por entidad: las unicas consultas que existen hoy
 * son "filtrar por ownerId/userId" y "reemplazar por id" — un esquema
 * relacional seria complejidad prematura para eso. Si mas adelante se
 * necesitan consultas reales (joins, paginado, busqueda), migrar a tablas
 * con `openDatabaseAsync`/`execAsync` es sencillo porque el resto de la
 * app solo conoce la interfaz `StorageService`.
 *
 * Nota: el patron leer-todo → modificar → escribir-todo no es atomico;
 * dos escrituras concurrentes sobre la misma coleccion podrian pisarse.
 * No es un riesgo real hoy (un solo usuario, escrituras disparadas
 * secuencialmente desde la UI), pero si en algun momento hay escrituras
 * concurrentes genuinas, esto necesita locking o pasar a tablas SQL.
 */
export class SqliteStorageService implements StorageService {
  private ready = Promise.all([
    seedIfEmpty(KEYS.designs, SEED_DESIGNS),
    seedIfEmpty(KEYS.proposals, SEED_PROPOSALS),
  ]);

  async saveDesign(design: TattooDesign): Promise<void> {
    await this.ready;
    const designs = await readAll<TattooDesign>(KEYS.designs);
    await writeAll(KEYS.designs, [...designs.filter((d) => d.id !== design.id), design]);
  }

  async getDesigns(ownerId?: string): Promise<TattooDesign[]> {
    await this.ready;
    const designs = await readAll<TattooDesign>(KEYS.designs);
    return ownerId ? designs.filter((d) => d.ownerId === ownerId) : designs;
  }

  async saveProposal(proposal: TattooProposal): Promise<void> {
    await this.ready;
    const proposals = await readAll<TattooProposal>(KEYS.proposals);
    await writeAll(KEYS.proposals, [...proposals.filter((p) => p.id !== proposal.id), proposal]);
  }

  async getProposals(userId: string): Promise<TattooProposal[]> {
    await this.ready;
    const proposals = await readAll<TattooProposal>(KEYS.proposals);
    return proposals.filter((p) => p.userId === userId);
  }
}
