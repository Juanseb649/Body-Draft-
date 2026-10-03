import { ArtistRepository } from '../artistRepository';
import { supabase } from '../../services/supabaseClient';

jest.mock('../../services/supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

/**
 * Encadenable como el builder real de supabase-js: cada metodo devuelve
 * el mismo objeto, y el resultado se resuelve donde el repositorio lo
 * espere (`maybeSingle`, `single` o el propio await de la query).
 */
function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'update', 'insert', 'delete', 'order', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  // Thenable, para las queries que se esperan sin `.single()`.
  (chain as unknown as PromiseLike<unknown>).then = ((onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'];
  return chain;
}

const repo = new ArtistRepository();

beforeEach(() => jest.clearAllMocks());

describe('ArtistRepository — mapeo de `profiles` a Artist', () => {
  it('rellena los huecos de una fila a medio completar', async () => {
    // Es el estado real de un tatuador recien registrado: el trigger
    // solo le puso id, name y role.
    from.mockReturnValue(
      builder({
        data: {
          id: 'u1',
          name: 'Nora Vega',
          specialty: null,
          bio: null,
          location: null,
          portfolio_image_urls: null,
          rating: null,
        },
        error: null,
      })
    );

    const artist = await repo.getArtistById('u1');

    expect(artist).toEqual({
      id: 'u1',
      name: 'Nora Vega',
      specialty: '',
      bio: undefined,
      location: undefined,
      portfolioImageUrls: [],
      availableSlots: [],
      rating: undefined,
    });
  });

  it('pone un nombre por defecto cuando el perfil no tiene ninguno', async () => {
    from.mockReturnValue(
      builder({ data: { id: 'u2', name: null, specialty: 'Realismo', portfolio_image_urls: [] }, error: null })
    );

    const artist = await repo.getArtistById('u2');

    // Sin esto la ficha saldria con el nombre en blanco.
    expect(artist?.name).toBe('Tatuador');
  });

  it('devuelve undefined si no existe', async () => {
    from.mockReturnValue(builder({ data: null, error: null }));
    await expect(repo.getArtistById('fantasma')).resolves.toBeUndefined();
  });

  it('propaga el error de Supabase en vez de tragarselo', async () => {
    from.mockReturnValue(builder({ data: null, error: new Error('RLS') }));
    await expect(repo.getArtistById('u1')).rejects.toThrow('RLS');
  });
});

describe('ArtistRepository.updateMyProfile', () => {
  const okRow = {
    data: { id: 'u1', name: 'Nora', specialty: null, bio: null, location: null, portfolio_image_urls: [] },
    error: null,
  };

  it('guarda los campos opcionales vacios como NULL, no como ""', async () => {
    const chain = builder(okRow);
    from.mockReturnValue(chain);

    await repo.updateMyProfile('u1', { name: 'Nora', specialty: '', bio: '   ', location: '', role: 'artist' });

    // Una cadena vacia pasaria los `?? undefined` del mapeo y acabaria
    // pintando una especialidad en blanco en la ficha publica.
    expect(chain.update).toHaveBeenCalledWith({
      name: 'Nora',
      specialty: null,
      bio: null,
      location: null,
      role: 'artist',
    });
  });

  it('recorta los espacios de los campos que si tienen contenido', async () => {
    const chain = builder(okRow);
    from.mockReturnValue(chain);

    await repo.updateMyProfile('u1', {
      name: 'Nora',
      specialty: '  Blackwork  ',
      bio: ' Doce años ',
      location: ' Bogotá ',
      role: 'artist',
    });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ specialty: 'Blackwork', bio: 'Doce años', location: 'Bogotá' })
    );
  });

  it('escribe solo la fila del usuario', async () => {
    const chain = builder(okRow);
    from.mockReturnValue(chain);

    await repo.updateMyProfile('u1', { name: 'Nora', specialty: '', bio: '', location: '', role: 'client' });

    expect(chain.eq).toHaveBeenCalledWith('id', 'u1');
  });
});
