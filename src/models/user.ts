/**
 * Rol del usuario dentro de la app.
 *
 * Un 'artist' tiene todo lo de 'client' (puede crear/guardar disenos y
 * agendar) mas la capacidad de publicar TattooDesign con
 * source: 'artistTemplate'.
 */
export type UserRole = 'client' | 'artist';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  savedProposalIds: string[];
}
