import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Segmented } from '../../components/atoms/Segmented';
import { Spinner } from '../../components/atoms/Spinner';
import { useArtistProfileStore } from '../../controllers/useArtistProfileStore';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useSettingsStore, type AccountRole } from '../../controllers/useSettingsStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { type as typo, useTheme } from '../../theme';

/** Campos editables, en el mismo orden en que se ven en pantalla. */
interface ProfileForm {
  name: string;
  role: AccountRole;
  specialty: string;
  location: string;
  bio: string;
}

/**
 * "Editar perfil": lo unico desde donde un tatuador puede completar su
 * ficha publica y publicar trabajos. Hasta que existio esta pantalla,
 * `bio`/`location` solo se podian rellenar por SQL y la tabla `designs`
 * no tenia ninguna forma de crecer desde la app.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const { profile, works, isLoading, isSaving, isPublishing, error, load, save, publishWork, removeWork } =
    useArtistProfileStore();

  // El modelo `Artist` no lleva `role` (getArtists ya filtra por el),
  // asi que el valor inicial sale del ajuste local, que `initAuth`
  // mantiene en sintonia con `profiles.role` al abrir sesion.
  const storedRole = useSettingsStore((s) => s.account.role);

  // El formulario no se copia al estado dentro de un efecto: mientras
  // nadie haya tocado nada, `draft` es null y se muestran los valores
  // del servidor; en cuanto se escribe, manda el borrador. Asi el
  // perfil puede llegar tarde sin pisar lo que el usuario ya tecleo, y
  // sin encadenar renders.
  const [draft, setDraft] = useState<ProfileForm | null>(null);

  const form: ProfileForm = draft ?? {
    // `getArtists` pone "Tatuador" cuando `name` viene vacio; como
    // valor inicial de un campo de texto seria confuso.
    name: profile && profile.name !== 'Tatuador' ? profile.name : '',
    role: storedRole,
    specialty: profile?.specialty ?? '',
    location: profile?.location ?? '',
    bio: profile?.bio ?? '',
  };
  const update = (patch: Partial<ProfileForm>) => setDraft({ ...form, ...patch });

  const [workTitle, setWorkTitle] = useState('');
  const [workStyle, setWorkStyle] = useState('');
  const [workImage, setWorkImage] = useState<string | null>(null);

  const styles = createStyles(colors);
  const isArtist = form.role === 'artist';

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const pickWorkImage = async () => {
    const granted = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted.granted) {
      Alert.alert('Sin permiso', 'Necesitamos acceso a tus fotos para subir un trabajo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) setWorkImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!userId) return;
    const ok = await save(userId, { ...form, name: form.name.trim() });
    if (ok) router.back();
  };

  const handlePublish = async () => {
    if (!userId || !workImage) return;
    const ok = await publishWork(userId, {
      title: workTitle.trim(),
      style: workStyle.trim() || undefined,
      localImageUri: workImage,
    });
    if (ok) {
      setWorkTitle('');
      setWorkStyle('');
      setWorkImage(null);
    }
  };

  const confirmRemove = (design: TattooDesign) => {
    Alert.alert('Quitar trabajo', `¿Quitar "${design.title}" de tu portafolio?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => removeWork(design) },
    ]);
  };

  if (isLoading && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Spinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Volver">
            <Text style={[typo.title, { color: colors.textStrong }]}>‹</Text>
          </Pressable>
          <Text style={[typo.title, { color: colors.textStrong }]}>Editar perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.secondary}
          value={form.name}
          onChangeText={(name) => update({ name })}
        />

        <Text style={styles.label}>¿Cómo usas BodyDraft?</Text>
        <Segmented
          value={form.role}
          onChange={(role) => update({ role })}
          options={[
            { value: 'client', label: 'Me quiero tatuar' },
            { value: 'artist', label: 'Soy tatuador' },
          ]}
        />

        {/* Los campos de ficha publica solo tienen sentido si eres
            tatuador: a un cliente nadie le busca la especialidad. */}
        {isArtist && (
          <>
            <Text style={styles.label}>Especialidad</Text>
            <TextInput
              style={styles.input}
              placeholder="Blackwork, Realismo, Fine line…"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              value={form.specialty}
              onChangeText={(specialty) => update({ specialty })}
            />

            <Text style={styles.label}>Ciudad</Text>
            <TextInput
              style={styles.input}
              placeholder="Bogotá, Colombia"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              value={form.location}
              onChangeText={(location) => update({ location })}
            />

            <Text style={styles.label}>Sobre ti</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Cómo trabajas, cuántos años llevas, cómo prefieres agendar…"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.secondary}
              value={form.bio}
              onChangeText={(bio) => update({ bio })}
              multiline
              textAlignVertical="top"
            />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <AppButton label="Guardar perfil" onPress={handleSave} isLoading={isSaving} disabled={!form.name.trim()} />

        {isArtist && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>Portafolio</Text>
            <Text style={styles.hint}>
              Lo que subas aquí es lo que ven los clientes en tu perfil y en el inicio de la app.
            </Text>

            <Pressable onPress={pickWorkImage} style={[styles.picker, { borderColor: colors.border }]}>
              {workImage ? (
                <Image source={{ uri: workImage }} style={styles.pickerImage} />
              ) : (
                <Text style={[typo.body, { color: colors.textMuted }]}>Elegir imagen del boceto o del trabajo</Text>
              )}
            </Pressable>

            {workImage && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Título (p. ej. Helecho en el antebrazo)"
                  placeholderTextColor={colors.placeholder}
                  selectionColor={colors.secondary}
                  value={workTitle}
                  onChangeText={setWorkTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Estilo (opcional)"
                  placeholderTextColor={colors.placeholder}
                  selectionColor={colors.secondary}
                  value={workStyle}
                  onChangeText={setWorkStyle}
                />
                <AppButton
                  label="Publicar trabajo"
                  variant="secondary"
                  onPress={handlePublish}
                  isLoading={isPublishing}
                  disabled={!workTitle.trim()}
                />
              </>
            )}

            <View style={styles.grid}>
              {works.map((work) => (
                <Pressable
                  key={work.id}
                  onLongPress={() => confirmRemove(work)}
                  style={styles.gridItem}
                  accessibilityHint="Mantén pulsado para quitarlo del portafolio"
                >
                  <Image source={{ uri: work.imageUrl }} style={styles.gridImage} />
                  <Text style={[typo.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {work.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            {works.length > 0 && <Text style={styles.hint}>Mantén pulsado un trabajo para quitarlo.</Text>}
            {works.length === 0 && <Text style={styles.hint}>Todavía no publicaste ningún trabajo.</Text>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    label: { ...typo.label, color: colors.textMuted, marginTop: 8 },
    hint: { ...typo.caption, color: colors.textMuted },
    input: {
      ...typo.body,
      color: colors.text,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    multiline: { minHeight: 110 },
    error: { ...typo.caption, color: colors.danger },
    divider: { height: 1, marginVertical: 20 },
    picker: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 18,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pickerImage: { width: '100%', height: '100%' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    gridItem: { width: '47%', gap: 4 },
    gridImage: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surfaceRaised },
  });
}
