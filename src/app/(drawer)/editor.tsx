import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { SectionHeader } from '../../components/molecules/SectionHeader';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { useCameraController } from '../../controllers/useCameraController';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONES, BODY_ZONE_LABELS, type BodyZone } from '../../models/bodyZone';
import { type as typo, useTheme } from '../../theme';

/** Pantalla "Crea": camara en vivo + diseno superpuesto + ajustes. */
export default function TattooEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { permission, requestPermission, cameraRef, capture } = useCameraController();
  const designs = useDesignStore((s) => s.designs);
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);

  const styles = createStyles(colors);

  if (!permission) return <View style={[styles.center, { backgroundColor: colors.background }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[typo.body, { color: colors.text, textAlign: 'center' }]}>
          Necesitamos permiso de cámara para continuar
        </Text>
        <AppButton label="Dar permiso" size="M" onPress={requestPermission} />
      </View>
    );
  }

  const handleSave = async () => {
    const uri = await capture();
    if (uri) proposal.attachCameraSnapshot(uri);
    await proposal.save();
    router.push('/artists');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.cameraContainer}>
        <CameraOverlay cameraRef={cameraRef} design={design} />

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

      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        <Text style={[typo.label, { color: colors.textMuted }]}>Zona del cuerpo</Text>
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

        <View style={{ height: 16 }} />
        <AppButton label="Guardar propuesta" onPress={handleSave} />
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
    cameraContainer: { flex: 1 },
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
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 20,
      gap: 8,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
    zoneRow: { gap: 8, paddingBottom: 4 },
    sliderLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  });
}
