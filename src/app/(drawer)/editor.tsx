import Slider from '@react-native-community/slider';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { BodyMannequin } from '../../components/atoms/BodyMannequin';
import { Chip } from '../../components/atoms/Chip';
import { Segmented } from '../../components/atoms/Segmented';
import { DesignOverlay } from '../../components/molecules/DesignOverlay';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useCameraController } from '../../controllers/useCameraController';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONES, BODY_ZONE_LABELS, type BodySilhouette, type BodyZone } from '../../models/bodyZone';
import type { TattooDesign } from '../../models/tattooDesign';
import { type as typo, useTheme } from '../../theme';

type Mode = 'mannequin' | 'camera';

const SILHOUETTE_LABEL: Record<BodySilhouette, string> = {
  neutral: 'Neutro',
  masculine: 'Masculino',
  feminine: 'Femenino',
};

/**
 * Pantalla "Crea": el boceto colocado sobre un maniquin o sobre tu
 * propia piel con la camara. El boceto se puede adjuntar desde aqui
 * mismo, sin tener que pasar antes por "Diseña".
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

  const [mode, setMode] = useState<Mode>('mannequin');
  const styles = createStyles(colors);

  // La pantalla se puede abrir directo desde el menu lateral, sin pasar
  // por "Diseña": sin esto el boceto ya elegido no se encontraria.
  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.stage}>
        {mode === 'camera' ? (
          permission?.granted ? (
            <CameraOverlay cameraRef={cameraRef} design={design} />
          ) : (
            <View style={styles.center}>
              <Text style={[typo.body, { color: colors.text, textAlign: 'center' }]}>
                Necesitamos permiso de cámara para probarlo sobre tu piel
              </Text>
              <AppButton label="Dar permiso" size="M" onPress={requestPermission} />
            </View>
          )
        ) : (
          <View style={styles.center}>
            <BodyMannequin silhouette={proposal.silhouette} height={400} />
            <DesignOverlay design={design} />
            {!design && (
              <Text style={[typo.caption, { color: colors.textMuted, position: 'absolute', bottom: 12 }]}>
                Adjunta un boceto para verlo sobre el cuerpo
              </Text>
            )}
          </View>
        )}

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <SectionHeader
            section="crea"
            style={{ flex: 1 }}
            right={
              <Pressable
                onPress={() => router.push('/model3d')}
                style={[styles.badge3d, { borderColor: colors.accent }]}
                hitSlop={8}
              >
                <Text style={[typo.caption, { color: colors.accent, fontFamily: typo.label.fontFamily }]}>3D</Text>
              </Pressable>
            }
          />
        </View>
      </View>

      <ScrollView
        style={[styles.sheet, { backgroundColor: colors.surface }]}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 8 }}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'mannequin', label: 'Maniquí' },
            { value: 'camera', label: 'Cámara' },
          ]}
        />

        <AppButton
          label={design ? 'Cambiar boceto' : 'Adjuntar boceto'}
          variant="secondary"
          size="M"
          onPress={attachSketch}
        />

        {mode === 'mannequin' && (
          <>
            <Text style={[typo.label, { color: colors.textMuted, marginTop: 8 }]}>Cuerpo</Text>
            <View style={styles.zoneRow}>
              {(Object.keys(SILHOUETTE_LABEL) as BodySilhouette[]).map((s) => (
                <Chip
                  key={s}
                  label={SILHOUETTE_LABEL[s]}
                  selected={proposal.silhouette === s}
                  onPress={() => proposal.setSilhouette(s)}
                  tone="fuchsia"
                />
              ))}
            </View>
          </>
        )}

        <Text style={[typo.label, { color: colors.textMuted, marginTop: 8 }]}>Zona del cuerpo</Text>
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
          <Text style={[typo.bodyStrong, { color: colors.primary }]}>{Math.round(proposal.placement.scale * 100)} %</Text>
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
          <Text style={[typo.bodyStrong, { color: colors.secondary }]}>{Math.round(proposal.placement.opacity * 100)} %</Text>
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
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    stage: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
    topBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    badge3d: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheet: {
      maxHeight: '52%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
    zoneRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  });
}
