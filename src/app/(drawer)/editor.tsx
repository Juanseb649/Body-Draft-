import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { Icon, type IconName } from '../../components/atoms/Icon';
import { MenuButton } from '../../components/atoms/MenuButton';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { Spinner } from '../../components/atoms/Spinner';
import { DesignOverlay } from '../../components/molecules/DesignOverlay';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { CreateIntroModal } from '../../components/organisms/CreateIntroModal';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useBodyModel } from '../../controllers/useBodyModel';
import { useCameraController } from '../../controllers/useCameraController';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import {
  BODY_SILHOUETTES,
  BODY_ZONES,
  BODY_ZONE_LABELS,
  type BodySilhouette,
  type BodyZone,
} from '../../models/bodyZone';
import type { TattooDesign } from '../../models/tattooDesign';
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
  const { designs, loadDesigns, uploadDesign } = useDesignStore();
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);

  const seenIntro = useSettingsStore((s) => s.onboarding.seenCreateIntro);
  const markIntroSeen = useSettingsStore((s) => s.markCreateIntroSeen);

  const [mode, setMode] = useState<Mode>('camera');
  // La primera vez se abre solo. Despues queda a un toque del boton (i).
  const [introOpen, setIntroOpen] = useState(!seenIntro);

  const model = useBodyModel(proposal.silhouette);
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

  const handleSave = async () => {
    // La foto solo existe en modo camara; en maniquin se guarda la
    // propuesta (zona + colocacion) sin instantanea.
    if (mode === 'camera') {
      const uri = await capture();
      if (uri) proposal.attachCameraSnapshot(uri);
    }
    await proposal.save();
    router.push('/artists');
  };

  const renderStage = () => {
    if (mode === 'camera') {
      if (permission?.granted) return <CameraOverlay cameraRef={cameraRef} design={design} />;
      return (
        <View style={styles.center}>
          <Icon name="camera" size={44} color={colors.textMuted} />
          <Text style={[typo.bodyStrong, { color: colors.text, textAlign: 'center' }]}>
            Necesitamos la cámara para probarlo sobre tu piel
          </Text>
          <Text style={[typo.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            La imagen se queda en tu teléfono.
          </Text>
          <AppButton label="Permitir cámara" size="M" onPress={requestPermission} />
          <Pressable onPress={() => setMode('mannequin')} hitSlop={8}>
            <Text style={[typo.bodyStrong, { color: colors.secondary }]}>Usar el maniquí</Text>
          </Pressable>
        </View>
      );
    }

    if (model.uri) {
      return (
        <View style={{ flex: 1 }}>
          <BodyModelViewer modelUrl={model.uri} alt={`Maniquí 3D — ${BODY_ZONE_LABELS[proposal.bodyZone]}`} />
          <DesignOverlay design={design} />
        </View>
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
    zoneRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  });
}
