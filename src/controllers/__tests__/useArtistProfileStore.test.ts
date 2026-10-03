import { artistRepository, designRepository } from '../../core/services';
import type { TattooDesign } from '../../models/tattooDesign';
import { useArtistProfileStore } from '../useArtistProfileStore';
import { useSettingsStore } from '../useSettingsStore';

jest.mock('../../core/services', () => ({
  artistRepository: { getMyProfile: jest.fn(), updateMyProfile: jest.fn() },
  designRepository: { getArtistTemplates: jest.fn(), publishArtistWork: jest.fn(), unpublishArtistWork: jest.fn() },
}));

const work = (id: string, title: string): TattooDesign => ({
  id,
  ownerId: 'u1',
  artistId: 'u1',
  title,
  imageUrl: `https://cdn.test/${id}.jpg`,
  source: 'artistTemplate',
  createdAt: '2026-10-02T10:00:00.000Z',
});

const initial = useArtistProfileStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useArtistProfileStore.setState(initial, true);
  useSettingsStore.setState((s) => ({ account: { ...s.account, role: 'client' } }));
});

describe('useArtistProfileStore.removeWork', () => {
  it('quita el trabajo de la lista al instante', async () => {
    useArtistProfileStore.setState({ works: [work('a', 'Helecho'), work('b', 'Polilla')] });
    (designRepository.unpublishArtistWork as jest.Mock).mockResolvedValue(undefined);

    await useArtistProfileStore.getState().removeWork(work('a', 'Helecho'));

    expect(useArtistProfileStore.getState().works.map((w) => w.id)).toEqual(['b']);
  });

  it('devuelve el trabajo a su sitio si el borrado falla', async () => {
    const works = [work('a', 'Helecho'), work('b', 'Polilla')];
    useArtistProfileStore.setState({ works });
    (designRepository.unpublishArtistWork as jest.Mock).mockRejectedValue(new Error('sin permiso'));

    const ok = await useArtistProfileStore.getState().removeWork(works[0]);

    // Lo peor de un borrado optimista mal hecho es que el trabajo
    // desaparece de la pantalla aunque siga existiendo en el servidor:
    // el tatuador cree que lo quito y vuelve al recargar.
    expect(ok).toBe(false);
    expect(useArtistProfileStore.getState().works.map((w) => w.id)).toEqual(['a', 'b']);
    expect(useArtistProfileStore.getState().error).toBe('sin permiso');
  });
});

describe('useArtistProfileStore.publishWork', () => {
  it('pone el trabajo nuevo primero, como al recargar', async () => {
    useArtistProfileStore.setState({ works: [work('viejo', 'Antiguo')] });
    (designRepository.publishArtistWork as jest.Mock).mockResolvedValue(work('nuevo', 'Reciente'));

    await useArtistProfileStore.getState().publishWork('u1', { title: 'Reciente', localImageUri: 'file:///x.jpg' });

    // `getArtistTemplates` ordena por fecha descendente; si se añadiera
    // al final, la lista saltaria de orden al recargar la pantalla.
    expect(useArtistProfileStore.getState().works.map((w) => w.id)).toEqual(['nuevo', 'viejo']);
  });

  it('no añade nada y deja el error si falla', async () => {
    useArtistProfileStore.setState({ works: [work('viejo', 'Antiguo')] });
    (designRepository.publishArtistWork as jest.Mock).mockRejectedValue(new Error('imagen muy pesada'));

    const ok = await useArtistProfileStore.getState().publishWork('u1', {
      title: 'Reciente',
      localImageUri: 'file:///x.jpg',
    });

    expect(ok).toBe(false);
    expect(useArtistProfileStore.getState().works).toHaveLength(1);
    expect(useArtistProfileStore.getState().error).toBe('imagen muy pesada');
    expect(useArtistProfileStore.getState().isPublishing).toBe(false);
  });
});

describe('useArtistProfileStore.save', () => {
  it('sincroniza el rol con los ajustes locales', async () => {
    (artistRepository.updateMyProfile as jest.Mock).mockResolvedValue({ id: 'u1', name: 'Nora' });

    await useArtistProfileStore
      .getState()
      .save('u1', { name: 'Nora', specialty: 'Blackwork', bio: '', location: '', role: 'artist' });

    // El sidebar pinta el rol desde los ajustes: sin esto seguiria
    // diciendo "Cliente" despues de guardarte como tatuador.
    expect(useSettingsStore.getState().account.role).toBe('artist');
  });

  it('no toca el rol local si el guardado falla', async () => {
    (artistRepository.updateMyProfile as jest.Mock).mockRejectedValue(new Error('offline'));

    const ok = await useArtistProfileStore
      .getState()
      .save('u1', { name: 'Nora', specialty: '', bio: '', location: '', role: 'artist' });

    expect(ok).toBe(false);
    expect(useSettingsStore.getState().account.role).toBe('client');
  });
});

describe('useArtistProfileStore.load', () => {
  it('no pide el catalogo si la cuenta no tiene perfil todavia', async () => {
    (artistRepository.getMyProfile as jest.Mock).mockResolvedValue(undefined);

    await useArtistProfileStore.getState().load('u1');

    expect(designRepository.getArtistTemplates).not.toHaveBeenCalled();
    expect(useArtistProfileStore.getState().works).toEqual([]);
    expect(useArtistProfileStore.getState().isLoading).toBe(false);
  });
});
