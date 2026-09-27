import type { Appointment } from '../models/appointment';
import { defaultPlacement } from '../models/placement';
import type { TattooDesign } from '../models/tattooDesign';
import type { TattooProposal } from '../models/tattooProposal';
import type { StorageService } from './storageService';

const now = () => new Date();
const daysAgo = (days: number) => new Date(now().getTime() - days * 86_400_000).toISOString();
const daysFromNow = (days: number) => new Date(now().getTime() + days * 86_400_000).toISOString();

/**
 * Implementacion de StorageService en memoria, con datos de ejemplo.
 *
 * Sirve para navegar y revisar el diseno de todas las pantallas sin
 * depender todavia de expo-sqlite (ver TODO en storageService.ts). No
 * persiste entre sesiones: se reinicia cada vez que arranca la app.
 */
export class InMemoryStorageService implements StorageService {
  private designs: TattooDesign[] = [
    {
      id: 'design-1',
      ownerId: 'current-user',
      title: 'Serpiente con flores',
      imageUrl: 'https://picsum.photos/seed/bodydraft-serpiente/400',
      source: 'aiGenerated',
      style: 'Japones',
      createdAt: daysAgo(2),
    },
    {
      id: 'design-2',
      ownerId: 'artist-1',
      title: 'Mandala geometrico',
      imageUrl: 'https://picsum.photos/seed/bodydraft-mandala/400',
      source: 'artistTemplate',
      style: 'Blackwork',
      artistId: 'artist-1',
      createdAt: daysAgo(10),
    },
  ];

  private proposals: TattooProposal[] = [
    {
      id: 'proposal-1',
      userId: 'current-user',
      designId: 'design-1',
      bodyZone: 'forearm',
      silhouette: 'neutral',
      placement: { ...defaultPlacement(), scale: 1.1 },
      status: 'saved',
      createdAt: daysAgo(1),
    },
  ];

  private appointments: Appointment[] = [
    {
      id: 'appointment-1',
      userId: 'current-user',
      artistId: 'artist-1',
      proposalId: 'proposal-1',
      dateTime: daysFromNow(5),
      status: 'pending',
    },
  ];

  async saveDesign(design: TattooDesign): Promise<void> {
    this.designs = [...this.designs.filter((d) => d.id !== design.id), design];
  }

  async getDesigns(ownerId?: string): Promise<TattooDesign[]> {
    if (!ownerId) return [...this.designs];
    return this.designs.filter((d) => d.ownerId === ownerId);
  }

  async saveProposal(proposal: TattooProposal): Promise<void> {
    this.proposals = [...this.proposals.filter((p) => p.id !== proposal.id), proposal];
  }

  async getProposals(userId: string): Promise<TattooProposal[]> {
    return this.proposals.filter((p) => p.userId === userId);
  }

  async saveAppointment(appointment: Appointment): Promise<void> {
    this.appointments = [
      ...this.appointments.filter((a) => a.id !== appointment.id),
      appointment,
    ];
  }

  async getAppointments(userId: string): Promise<Appointment[]> {
    return this.appointments.filter((a) => a.userId === userId);
  }
}
