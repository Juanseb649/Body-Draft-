import { DesignRepository } from '../designRepository';
import type { AIService } from '../../services/aiService';
import type { ImageUploadService } from '../../services/imageUploadService';
import type { StorageService } from '../../services/storageService';
import type { TattooDesign } from '../../models/tattooDesign';
import { supabase } from '../../services/supabaseClient';

jest.mock('../../services/supabaseClient', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'insert', 'delete', 'order', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn().mockResolvedValue(result);
  // Thenable, para las queries que se esperan sin `.single()`.
  (chain as unknown as PromiseLike<unknown>).then = ((onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected)) as PromiseLike<unknown>['then'];
  return chain;
}

const storage = {} as StorageService;
const ai = {} as AIService;

let images: jest.Mocked<ImageUploadService>;
let repo: DesignRepository;

beforeEach(() => {
  jest.clearAllMocks();
  images = {
    uploadPortfolioImage: jest.fn().mockResolvedValue('https://cdn.test/portfolio/u1/foto.jpg'),
    removePortfolioImage: jest.fn().mockResolvedValue(undefined),
  };
  repo = new DesignRepository(storage, ai, images);
});

const insertedRow = {
  id: 'd1',
  artist_id: 'u1',
  title: 'Helecho',
  description: null,
  image_url: 'https://cdn.test/portfolio/u1/foto.jpg',
  style: 'Blackwork',
  created_at: '2026-10-02T10:00:00.000Z',
  profiles: { name: 'Nora Vega' },
};

describe('DesignRepository.publishArtistWork', () => {
  it('sube la imagen antes de guardar la fila, y guarda la URL remota', async () => {
    const chain = builder({ data: insertedRow, error: null });
    from.mockReturnValue(chain);

    const design = await repo.publishArtistWork('u1', {
      title: 'Helecho',
      style: 'Blackwork',
      localImageUri: 'file:///data/user/0/cache/boceto.jpg',
    });

    expect(images.uploadPortfolioImage).toHaveBeenCalledWith('file:///data/user/0/cache/boceto.jpg', 'u1');
    // Lo que se guarda tiene que ser la URL del servidor: con la ruta
    // local, el trabajo se veria roto en cualquier otro telefono.
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ artist_id: 'u1', image_url: 'https://cdn.test/portfolio/u1/foto.jpg' })
    );
    expect(design.imageUrl).toBe('https://cdn.test/portfolio/u1/foto.jpg');
    expect(design.source).toBe('artistTemplate');
  });

  it('no vuelve a subir una imagen que ya esta en el servidor', async () => {
    from.mockReturnValue(builder({ data: insertedRow, error: null }));

    await repo.publishArtistWork('u1', { title: 'Helecho', localImageUri: 'https://cdn.test/ya/subida.jpg' });

    expect(images.uploadPortfolioImage).not.toHaveBeenCalled();
  });

  it('borra la imagen recien subida si el insert falla', async () => {
    from.mockReturnValue(builder({ data: null, error: new Error('violates row-level security') }));

    await expect(
      repo.publishArtistWork('u1', { title: 'Helecho', localImageUri: 'file:///cache/boceto.jpg' })
    ).rejects.toThrow('row-level security');

    // Sin esto el bucket acumula imagenes que ninguna fila referencia:
    // ocupan espacio y nadie se entera nunca.
    expect(images.removePortfolioImage).toHaveBeenCalledWith('https://cdn.test/portfolio/u1/foto.jpg');
  });

  it('sigue propagando el error del insert aunque falle tambien el borrado', async () => {
    from.mockReturnValue(builder({ data: null, error: new Error('insert roto') }));
    images.removePortfolioImage.mockRejectedValue(new Error('storage caido'));

    // El que importa es el error del insert, no el de la limpieza.
    await expect(
      repo.publishArtistWork('u1', { title: 'Helecho', localImageUri: 'file:///cache/boceto.jpg' })
    ).rejects.toThrow('insert roto');
  });

  it('manda NULL y no cadena vacia en los campos opcionales', async () => {
    const chain = builder({ data: insertedRow, error: null });
    from.mockReturnValue(chain);

    await repo.publishArtistWork('u1', { title: 'Helecho', description: '', style: '', localImageUri: 'file:///x.jpg' });

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ description: null, style: null }));
  });
});

describe('DesignRepository.unpublishArtistWork', () => {
  const design: TattooDesign = {
    id: 'd1',
    ownerId: 'u1',
    artistId: 'u1',
    title: 'Helecho',
    imageUrl: 'https://cdn.test/portfolio/u1/foto.jpg',
    source: 'artistTemplate',
    createdAt: '2026-10-02T10:00:00.000Z',
  };

  it('borra la fila y despues la imagen', async () => {
    const chain = builder({ data: null, error: null });
    from.mockReturnValue(chain);

    await repo.unpublishArtistWork(design);

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'd1');
    expect(images.removePortfolioImage).toHaveBeenCalledWith(design.imageUrl);
  });

  it('no toca la imagen si no se pudo borrar la fila', async () => {
    from.mockReturnValue(builder({ data: null, error: new Error('no permitido') }));

    await expect(repo.unpublishArtistWork(design)).rejects.toThrow('no permitido');

    // Al reves se quedaria un trabajo visible sin imagen.
    expect(images.removePortfolioImage).not.toHaveBeenCalled();
  });
});
