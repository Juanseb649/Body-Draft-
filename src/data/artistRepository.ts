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
}
