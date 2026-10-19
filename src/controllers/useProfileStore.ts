import { create } from 'zustand';

import { artistRepository, imageUploadService } from '../core/services';
import { friendlyProfileError, validateDisplayName } from '../models/profileErrors';

/** Lo que la app muestra de la cuenta con la sesion abierta. */
export interface MyProfile {
  name?: string;
  avatarUrl?: string;
}

interface ProfileState {
  profile: MyProfile;
  /** De quien es `profile`: al cambiar de cuenta no se ve la foto de la anterior. */
  userId?: string;
  isSaving: boolean;
  error?: string;
  /** Lee nombre y foto del perfil propio (Inicio, menu y Ajustes lo comparten). */
  load: (userId: string) => Promise<void>;
  /** Sube la foto elegida, la pone en el perfil y borra la anterior. */
  changeAvatar: (userId: string, localUri: string) => Promise<boolean>;
  /** Quita la foto: vuelven las iniciales. */
  removeAvatar: (userId: string) => Promise<boolean>;
  /**
   * Cambia el nombre visible. Sus comentarios lo reflejan solos: lo hace
   * un trigger de la base (migracion 20261018200000).
   */
  rename: (userId: string, raw: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Controller del perfil propio: nombre y foto. La foto vive en el
 * bucket `avatars` (cada quien solo escribe en su carpeta, ver la
 * migracion 20261018200000) porque la ven OTRAS cuentas: en los
 * comentarios y en la ficha de un tatuador.
 */
export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: {},
  isSaving: false,
  error: undefined,

  load: async (userId) => {
    if (get().userId !== userId) set({ profile: {}, userId });
    try {
      const me = await artistRepository.getMyProfile(userId);
      if (me) set({ profile: { name: me.name, avatarUrl: me.avatarUrl } });
    } catch (e) {
      // Sin perfil la app sigue: se ven las iniciales del registro.
      console.warn('No se pudo leer el perfil:', e);
    }
  },

  changeAvatar: async (userId, localUri) => {
    const previous = get().profile.avatarUrl;
    set({ isSaving: true, error: undefined });
    try {
      const url = await imageUploadService.uploadAvatar(localUri, userId);
      try {
        await artistRepository.setMyAvatar(userId, url);
      } catch (e) {
        // El perfil no la acepto: que no quede una foto huerfana en Storage.
        await imageUploadService.removeAvatar(url).catch(() => {});
        throw e;
      }
      set({ profile: { ...get().profile, avatarUrl: url }, isSaving: false });
      // Se borra la vieja DESPUES de apuntar a la nueva: si fallara, mejor
      // un archivo de sobra que un perfil apuntando a nada.
      if (previous) await imageUploadService.removeAvatar(previous).catch(() => {});
      return true;
    } catch (e) {
      set({ isSaving: false, error: friendlyProfileError(e) });
      return false;
    }
  },

  removeAvatar: async (userId) => {
    const previous = get().profile.avatarUrl;
    if (!previous) return true;
    set({ isSaving: true, error: undefined });
    try {
      await artistRepository.setMyAvatar(userId, null);
      set({ profile: { ...get().profile, avatarUrl: undefined }, isSaving: false });
      await imageUploadService.removeAvatar(previous).catch(() => {});
      return true;
    } catch (e) {
      set({ isSaving: false, error: friendlyProfileError(e) });
      return false;
    }
  },

  rename: async (userId, raw) => {
    const valid = validateDisplayName(raw);
    if (!valid.ok) {
      set({ error: valid.error });
      return false;
    }
    set({ isSaving: true, error: undefined });
    try {
      await artistRepository.setMyName(userId, valid.name);
      set({ profile: { ...get().profile, name: valid.name }, isSaving: false });
      return true;
    } catch (e) {
      set({ isSaving: false, error: friendlyProfileError(e) });
      return false;
    }
  },

  clearError: () => set({ error: undefined }),

  reset: () => set({ profile: {}, userId: undefined, isSaving: false, error: undefined }),
}));
