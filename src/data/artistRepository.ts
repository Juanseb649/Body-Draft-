import type { Artist } from '../models/artist';
import { supabase } from '../services/supabaseClient';

/** Fila de `public.profiles` (ver supabase/migrations/, esquema profiles/appointments). */
interface ProfileRow {
  id: string;
  name: string | null;
  specialty: string | null;
  bio: string | null;
  location: string | null;
  portfolio_image_urls: string[] | null;
  rating: number | null;
}

function toArtist(row: ProfileRow): Artist {
  return {
    id: row.id,
    name: row.name ?? 'Tatuador',
    specialty: row.specialty ?? '',
    bio: row.bio ?? undefined,
    portfolioImageUrls: row.portfolio_image_urls ?? [],
    location: row.location ?? undefined,
    availableSlots: [],
    rating: row.rating ?? undefined,
  };
}

/**
 * Acceso a la lista de tatuadores: cuentas reales de Supabase con
 * `profiles.role = 'artist'` (se vuelven tatuador desde Ajustes > "Soy
 * tatuador", ver useAuthStore.updateRole). No requiere persistencia
 * local propia porque no cambia con el uso del usuario.
 */
export class ArtistRepository {
  async getArtists(specialty?: string): Promise<Artist[]> {
    let query = supabase.from('profiles').select('*').eq('role', 'artist');
    if (specialty) query = query.eq('specialty', specialty);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ProfileRow[]).map(toArtist);
  }

  async getArtistById(id: string): Promise<Artist | undefined> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'artist')
      .maybeSingle();
    if (error) throw error;
    return data ? toArtist(data as ProfileRow) : undefined;
  }

  /**
   * El perfil de la cuenta con la sesion abierta. No filtra por
   * `role`: a diferencia de `getArtistById`, aqui hace falta poder
   * leerlo aunque todavia no sea tatuador (es justo lo que permite
   * volverse uno desde "Editar perfil").
   */
  async getMyProfile(userId: string): Promise<Artist | undefined> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? toArtist(data as ProfileRow) : undefined;
  }

  /**
   * Guarda los campos editables del perfil propio. La RLS ya impide
   * tocar el de otro, pero el `eq('id', userId)` deja explicito en el
   * codigo que esto solo escribe una fila.
   */
  async updateMyProfile(userId: string, patch: ArtistProfilePatch): Promise<Artist> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: patch.name,
        // Una cadena vacia en un campo opcional se guarda como NULL:
        // asi `coalesce`/`??` de toda la app la tratan como "sin dato"
        // en vez de pintar un hueco.
        specialty: emptyToNull(patch.specialty),
        bio: emptyToNull(patch.bio),
        location: emptyToNull(patch.location),
        role: patch.role,
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return toArtist(data as ProfileRow);
  }
}

/** Campos del perfil que el propio tatuador puede editar. */
export interface ArtistProfilePatch {
  name: string;
  specialty: string;
  bio: string;
  location: string;
  role: 'client' | 'artist';
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
