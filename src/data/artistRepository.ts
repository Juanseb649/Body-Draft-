import type { Artist } from '../models/artist';

/**
 * Acceso a la lista de tatuadores. En el MVP se sirve desde el backend
 * (Firebase/API REST); no requiere persistencia local propia porque
 * no cambia con el uso del usuario.
 *
 * TODO: sustituir `SEED_ARTISTS` por la llamada real (Firestore o
 * endpoint REST) cuando exista el backend.
 */
const SEED_ARTISTS: Artist[] = [
  {
    id: 'artist-1',
    name: 'Camila Rios',
    specialty: 'Blackwork',
    bio: 'Especialista en mandalas y geometria sagrada.',
    portfolioImageUrls: [
      'https://picsum.photos/seed/bodydraft-artist1-a/400',
      'https://picsum.photos/seed/bodydraft-artist1-b/400',
    ],
    location: 'CDMX',
    availableSlots: [],
    rating: 4.8,
  },
  {
    id: 'artist-2',
    name: 'Diego Fernandez',
    specialty: 'Realismo',
    bio: 'Retratos y realismo en escala de grises.',
    portfolioImageUrls: ['https://picsum.photos/seed/bodydraft-artist2-a/400'],
    location: 'Guadalajara',
    availableSlots: [],
    rating: 4.6,
  },
];

export class ArtistRepository {
  async getArtists(specialty?: string): Promise<Artist[]> {
    if (!specialty) return SEED_ARTISTS;
    return SEED_ARTISTS.filter((a) => a.specialty === specialty);
  }

  async getArtistById(id: string): Promise<Artist | undefined> {
    return SEED_ARTISTS.find((a) => a.id === id);
  }
}
