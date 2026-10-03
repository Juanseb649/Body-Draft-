import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { MenuButton } from '../../components/atoms/MenuButton';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { Segmented } from '../../components/atoms/Segmented';
import { Spinner } from '../../components/atoms/Spinner';
import { DesignOverlay } from '../../components/molecules/DesignOverlay';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { AiPhotoConsentModal } from '../../components/organisms/AiPhotoConsentModal';
import { CreateIntroModal } from '../../components/organisms/CreateIntroModal';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useBodyModel } from '../../controllers/useBodyModel';
import { useCameraController } from '../../controllers/useCameraController';
import { useDataUri } from '../../controllers/useDataUri';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import {
  BODY_SILHOUETTES,
  BODY_ZONES,
  BODY_ZONE_LABELS,
  bodyZoneLabel,
  type BodySilhouette,
  type BodyZone,
} from '../../models/bodyZone';
import { displayImageUrl, type TattooDesign } from '../../models/tattooDesign';
import { type as typo, useTheme } from '../../theme';

type Mode = 'camera' | 'mannequin';

const SILHOUETTE_LABEL: Record<BodySilhouette, string> = {
  masculine: 'Masculino',
  feminine: 'Femenino',
};

const MODES: { value: Mode; label: string; hint: string; icon: IconName }[] = [
  { value: 'camera', label: 'Cámara', hint: 'Sobre tu piel', icon: 'camera' },
  { value: 'mannequin', label: 'Maniquí', hint: 'Modelo 3D', icon: 'body' },
];

/**
 * Pantalla "Crea": el boceto colocado sobre tu propia piel con la
 * camara, o sobre un maniquin 3D que se gira con el dedo.
 *
 * Arranca en camara a proposito: es lo que la gente viene a hacer
 * aqui, y el maniquin es la alternativa para quien no quiera dar
 * permiso de camara o no tenga el cuerpo a mano (p. ej. la espalda).
 */
export default function TattooEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { permission, requestPermission, cameraRef, capture } = useCameraController();
  const ownerId = useAuthStore((s) => s.user?.id) ?? 'current-user';
  const { designs, loadDesigns, uploadDesign, removeBackground, restoreBackground, isProcessingImage, error } =
    useDesignStore();
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);
  const hasCutout = Boolean(design?.processedImageUrl);

  const seenIntro = useSettingsStore((s) => s.onboarding.seenCreateIntro);
  const markIntroSeen = useSettingsStore((s) => s.markCreateIntroSeen);

  const allowAiPhoto = useSettingsStore((s) => s.privacy.allowAiPhotoUpload);
  const setAllowAiPhoto = useSettingsStore((s) => s.setAllowAiPhotoUpload);

  const [mode, setMode] = useState<Mode>('camera');
  const [consentOpen, setConsentOpen] = useState(false);
  // La primera vez se abre solo. Despues queda a un toque del boton (i).
  const [introOpen, setIntroOpen] = useState(!seenIntro);

  const model = useBodyModel(proposal.silhouette);
  // El WebView no puede abrir el file:// que devuelve el selector de
  // imagenes, asi que el boceto viaja convertido a data URI.
  const sketchDataUri = useDataUri(design ? displayImageUrl(design) : null);
  const styles = createStyles(colors);

  // La pantalla se puede abrir directo desde el menu lateral, sin pasar
  // por "Diseña": sin esto el boceto ya elegido no se encontraria.
  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  const closeIntro = () => {
    setIntroOpen(false);
    markIntroSeen();
  };

  const attachSketch = async () => {
    const granted = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const sketch: TattooDesign = {
      id: Crypto.randomUUID(),
      ownerId,
      title: 'Boceto',
      imageUrl: result.assets[0].uri,
      source: 'userUpload',
      createdAt: new Date().toISOString(),
    };
    await uploadDesign(sketch);
    proposal.selectDesign(sketch.id);
  };

  /** Dispara la foto: a partir de aqui se revisa sobre la captura. */
  const takePhoto = async () => {
    const uri = await capture();
    if (uri) proposal.attachCameraSnapshot(uri);
  };

  const composeWithAI = async () => {
    if (!design) return;
    // El consentimiento se pide una vez y queda guardado; sin el, ni
    // se llega a construir la peticion.
    if (!allowAiPhoto) {
      setConsentOpen(true);
      return;
    }
    await proposal.renderWithAI(displayImageUrl(design), bodyZoneLabel(proposal.bodyZone));
  };

  const acceptConsent = async () => {
    setAllowAiPhoto(true);
    setConsentOpen(false);
    if (design) {
      await proposal.renderWithAI(displayImageUrl(design), bodyZoneLabel(proposal.bodyZone));
    }
  };

  const handleSave = async () => {
    await proposal.save();
    router.push('/artists');
  };

  const renderStage = () => {
    if (mode === 'camera') {
      // Con una foto tomada se revisa sobre ella, no sobre el vivo:
      // es lo que se va a componer y lo que se va a guardar.
      if (proposal.cameraSnapshotUrl) {
        return (
          <View style={{ flex: 1 }}>
            <Image
              source={{ uri: proposal.renderedImageUrl ?? proposal.cameraSnapshotUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
            {/* Sobre el resultado de la IA el boceto ya esta dentro
                de la imagen: volver a superponerlo lo duplicaria. */}
            {!proposal.renderedImageUrl && <DesignOverlay design={design} />}
            {proposal.isRendering && (
              <View style={styles.rendering}>
                <Spinner color="#FFFFFF" />
                <Text style={[typo.bodyStrong, { color: '#FFFFFF' }]}>Componiendo sobre tu piel…</Text>
              </View>
            )}
          </View>
        );
      }
      if (permission?.granted) return <CameraOverlay cameraRef={cameraRef} design={design} />;
      return (
        <View style={styles.center}>
          <Icon name="camera" size={44} color={colors.textMuted} />
          <Text style={[typo.bodyStrong, { color: colors.text, textAlign: 'center' }]}>
            Necesitamos la cámara para probarlo sobre tu piel
          </Text>
          <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            La vista previa ocurre dentro de tu teléfono.
          </Text>
          <AppButton label="Permitir cámara" size="M" onPress={requestPermission} />
          <Pressable onPress={() => setMode('mannequin')} hitSlop={8}>
            <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Usar el maniquí</Text>
          </Pressable>
        </View>
      );
    }

    if (model.uri) {
      // Sin DesignOverlay encima: aqui el tatuaje va proyectado
      // sobre la malla, dentro de la escena 3D, para que siga la
      // curvatura del cuerpo.
      return (
        <BodyModelViewer
          modelUrl={model.uri}
          textureUrl={sketchDataUri}
          zone={proposal.bodyZone}
          size={proposal.placement.scale}
          rotationDegrees={proposal.placement.rotationDegrees}
          opacity={proposal.placement.opacity}
          cutout={proposal.hideBackground}
        />
      );
    }

    return (
      <View style={[styles.center, { backgroundColor: '#131015' }]}>
        {model.loading && <Spinner color={colors.primaryText} />}
        {model.error && <Text style={[typo.body, { color: '#FFFFFF' }]}>{model.error}</Text>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.stage}>
        {renderStage()}

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <MenuButton />
          <View style={styles.titleGroup}>
            <SectionIcon section="crea" size={30} />
            <Text style={[typo.logoSection, styles.title]}>Crea</Text>
          </View>
          <Pressable
            onPress={() => setIntroOpen(true)}
            style={styles.roundButton}
            hitSlop={8}
            accessibilityLabel="Cómo funciona"
          >
            <Icon name="info" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {!design && (
          <View style={[styles.emptyHint, { bottom: 16 }]}>
            <Text style={[typo.caption, { color: '#FFFFFF' }]}>Adjunta un boceto para verlo sobre el cuerpo</Text>
          </View>
        )}

        {mode === 'camera' && permission?.granted && !proposal.cameraSnapshotUrl && (
          <Pressable
            onPress={takePhoto}
            style={[styles.shutter, { bottom: 24 }]}
            accessibilityLabel="Tomar foto"
            accessibilityHint="Captura para ver el resultado realista"
          >
            <Icon name="shutter" size={64} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={[styles.sheet, { backgroundColor: colors.surface }]}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 10 }}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <View style={styles.modeRow}>
          {MODES.map((option) => {
            const active = mode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.modeCard,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primaryTint },
                ]}
              >
                <Icon name={option.icon} size={24} color={active ? colors.primaryText : colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: active ? colors.primaryText : colors.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[typo.caption, { color: colors.textMuted }]}>{option.hint}</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Icono y no texto: "Cambiar boceto" ocupaba una fila entera
              para una accion que se usa una vez. Que hace lo cuenta el
              modal de "Cómo funciona". */}
          <Pressable
            onPress={attachSketch}
            style={[styles.sketchButton, { borderColor: design ? colors.secondary : colors.border }]}
            accessibilityLabel={design ? 'Cambiar boceto' : 'Adjuntar boceto'}
            accessibilityHint="Abre tus fotos para elegir el diseño"
          >
            <Icon name="image" size={24} color={design ? colors.secondary : colors.textMuted} />
          </Pressable>
        </View>

        {mode === 'camera' && proposal.cameraSnapshotUrl && (
          <>
            <AppButton
              label={proposal.renderedImageUrl ? 'Rehacer la composición' : 'Ver resultado realista'}
              onPress={composeWithAI}
              isLoading={proposal.isRendering}
              disabled={!design}
            />
            <Text style={styles.hint}>
              La IA aplica el tatuaje siguiendo la curvatura y la luz de tu piel. Tu foto se envía a Google para
              esto; el resto de la app no sale del teléfono.
            </Text>
            {proposal.renderError && <Text style={styles.error}>{proposal.renderError}</Text>}
            <AppButton
              label="Repetir la foto"
              variant="secondary"
              size="M"
              onPress={proposal.discardCameraSnapshot}
            />
          </>
        )}

        {design && !proposal.cameraSnapshotUrl && (
          <>
            <Text style={styles.hint}>
              {mode === 'mannequin'
                ? 'Gira el maniquí con el dedo y toca dónde quieres el tatuaje. Las zonas de abajo enfocan y colocan por ti.'
                : 'Arrastra el boceto con un dedo; con dos, gíralo y cambia su tamaño. Doble toque lo recentra.'}
            </Text>

            <Text style={styles.label}>Fondo del boceto</Text>
            <Segmented
              value={proposal.hideBackground ? 'sin' : 'con'}
              onChange={(v) => proposal.setHideBackground(v === 'sin')}
              options={[
                { value: 'sin', label: 'Sin fondo' },
                { value: 'con', label: 'Con fondo' },
              ]}
            />
            <Text style={styles.hint}>
              &quot;Sin fondo&quot; vuelve transparente el papel del boceto al instante, aquí en el teléfono. Si está
              sobre un fondo complicado y no basta, el recorte con IA entiende la escena.
            </Text>

            <AppButton
              label={hasCutout ? 'Deshacer recorte con IA' : 'Recortar con IA'}
              variant="secondary"
              size="M"
              isLoading={isProcessingImage}
              onPress={() => (hasCutout ? restoreBackground(design.id) : removeBackground(design.id))}
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}

        {mode === 'mannequin' && (
          <>
            <Text style={styles.label}>Cuerpo</Text>
            <View style={styles.zoneRow}>
              {BODY_SILHOUETTES.map((silhouette) => (
                <Chip
                  key={silhouette}
                  label={SILHOUETTE_LABEL[silhouette]}
                  selected={proposal.silhouette === silhouette}
                  onPress={() => proposal.setSilhouette(silhouette)}
                  tone="fuchsia"
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Zona del cuerpo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneRow}>
          {BODY_ZONES.map((zone: BodyZone) => (
            <Chip
              key={zone}
              label={BODY_ZONE_LABELS[zone]}
              selected={proposal.bodyZone === zone}
              onPress={() => proposal.setZone(zone)}
              tone="blue"
            />
          ))}
        </ScrollView>

        <View style={styles.sliderLabel}>
          <Text style={[typo.bodyStrong, { color: colors.text }]}>Tamaño</Text>
          <Text style={[typo.bodyStrong, { color: colors.primary }]}>
            {Math.round(proposal.placement.scale * 100)} %
          </Text>
        </View>
        <Slider
          minimumValue={0.3}
          maximumValue={2.5}
          value={proposal.placement.scale}
          onValueChange={proposal.scale}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />

        <View style={styles.sliderLabel}>
          <Text style={[typo.bodyStrong, { color: colors.text }]}>Opacidad</Text>
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>
            {Math.round(proposal.placement.opacity * 100)} %
          </Text>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={proposal.placement.opacity}
          onValueChange={proposal.setOpacity}
          minimumTrackTintColor={colors.secondary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.secondary}
        />

        <View style={{ height: 8 }} />
        <AppButton label="Guardar propuesta" onPress={handleSave} disabled={!design} />
      </ScrollView>

      <CreateIntroModal visible={introOpen} onClose={closeIntro} />
      <AiPhotoConsentModal
        visible={consentOpen}
        onAccept={acceptConsent}
        onCancel={() => setConsentOpen(false)}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    stage: { flex: 1, backgroundColor: '#131015' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
    topBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleGroup: { flexDirection: 'row', alignItems: 'center' },
    // Encima de la camara y del visor 3D el fondo siempre es oscuro,
    // asi que estos dos van en blanco en los dos temas.
    title: { color: '#FFFFFF', fontSize: 32, lineHeight: 32 * 1.3, marginLeft: 6 },
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    emptyHint: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: { maxHeight: '52%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
    modeRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
    modeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1.5,
    },
    sketchButton: {
      width: 56,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...typo.label, color: colors.textMuted, marginTop: 8 },
    hint: { ...typo.caption, color: colors.textMuted },
    shutter: { position: 'absolute', alignSelf: 'center' },
    rendering: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    error: { ...typo.caption, color: colors.danger },
    zoneRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  });
}
