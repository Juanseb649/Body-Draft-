import { artistRepository, imageUploadService } from '../../core/services';
import { useProfileStore } from '../useProfileStore';

jest.mock('../../core/services', () => ({
  artistRepository: { getMyProfile: jest.fn(), setMyAvatar: jest.fn(), setMyName: jest.fn() },
  imageUploadService: { uploadAvatar: jest.fn(), removeAvatar: jest.fn() },
}));

const repo = artistRepository as jest.Mocked<typeof artistRepository>;
const images = imageUploadService as jest.Mocked<typeof imageUploadService>;

const NEW_URL = 'https://x.supabase.co/storage/v1/object/public/avatars/u1/nueva.jpg';
const OLD_URL = 'https://x.supabase.co/storage/v1/object/public/avatars/u1/vieja.jpg';

beforeEach(() => {
  jest.clearAllMocks();
  useProfileStore.getState().reset();
  images.removeAvatar.mockResolvedValue();
});

describe('useProfileStore.changeAvatar', () => {
  it('sube la foto, la pone en el perfil y despues borra la anterior', async () => {
    useProfileStore.setState({ profile: { name: 'Sebas', avatarUrl: OLD_URL } });
    images.uploadAvatar.mockResolvedValue(NEW_URL);
    repo.setMyAvatar.mockResolvedValue();

    await expect(useProfileStore.getState().changeAvatar('u1', 'file:///foto.jpg')).resolves.toBe(true);

    expect(repo.setMyAvatar).toHaveBeenCalledWith('u1', NEW_URL);
    expect(images.removeAvatar).toHaveBeenCalledWith(OLD_URL);
    expect(useProfileStore.getState().profile.avatarUrl).toBe(NEW_URL);
  });

  it('si el perfil no la acepta, borra la recien subida y conserva la anterior', async () => {
    useProfileStore.setState({ profile: { avatarUrl: OLD_URL } });
    images.uploadAvatar.mockResolvedValue(NEW_URL);
    repo.setMyAvatar.mockRejectedValue(new Error('RLS'));

    await expect(useProfileStore.getState().changeAvatar('u1', 'file:///foto.jpg')).resolves.toBe(false);

    expect(images.removeAvatar).toHaveBeenCalledWith(NEW_URL);
    expect(images.removeAvatar).not.toHaveBeenCalledWith(OLD_URL);
    expect(useProfileStore.getState().profile.avatarUrl).toBe(OLD_URL);
    expect(useProfileStore.getState().error).toMatch(/RLS/);
  });
});

describe('useProfileStore.removeAvatar', () => {
  it('quita la foto del perfil (vuelven las iniciales) y borra el archivo', async () => {
    useProfileStore.setState({ profile: { name: 'Sebas', avatarUrl: OLD_URL } });
    repo.setMyAvatar.mockResolvedValue();

    await useProfileStore.getState().removeAvatar('u1');

    expect(repo.setMyAvatar).toHaveBeenCalledWith('u1', null);
    expect(useProfileStore.getState().profile.avatarUrl).toBeUndefined();
    expect(images.removeAvatar).toHaveBeenCalledWith(OLD_URL);
  });
});

describe('useProfileStore.load', () => {
  it('al entrar con otra cuenta no se ve, ni un instante, la foto de la anterior', async () => {
    useProfileStore.setState({ profile: { name: 'Antes', avatarUrl: OLD_URL }, userId: 'u1' });
    let resolve!: (v: unknown) => void;
    repo.getMyProfile.mockReturnValue(new Promise((r) => (resolve = r)) as never);

    const pending = useProfileStore.getState().load('u2');
    expect(useProfileStore.getState().profile).toEqual({});

    resolve({ id: 'u2', name: 'Lucía', specialty: '', portfolioImageUrls: [], availableSlots: [] });
    await pending;
    expect(useProfileStore.getState().profile).toEqual({ name: 'Lucía', avatarUrl: undefined });
  });
});

describe('useProfileStore — errores y nombre', () => {
  it('"Bucket not found" se muestra como un mensaje que se entiende', async () => {
    images.uploadAvatar.mockRejectedValue(new Error('Bucket not found'));
    await useProfileStore.getState().changeAvatar('u1', 'file:///foto.jpg');
    expect(useProfileStore.getState().error).toMatch(/no están activadas en el servidor/);
  });

  it('renombrar guarda el nombre limpio en el perfil', async () => {
    repo.setMyName.mockResolvedValue();
    await expect(useProfileStore.getState().rename('u1', '  Sebas   Ibarra ')).resolves.toBe(true);
    expect(repo.setMyName).toHaveBeenCalledWith('u1', 'Sebas Ibarra');
    expect(useProfileStore.getState().profile.name).toBe('Sebas Ibarra');
  });

  it('un nombre vacio ni llega al servidor', async () => {
    await expect(useProfileStore.getState().rename('u1', '   ')).resolves.toBe(false);
    expect(repo.setMyName).not.toHaveBeenCalled();
    expect(useProfileStore.getState().error).toBeTruthy();
  });
});
