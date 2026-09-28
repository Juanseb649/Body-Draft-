import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../../components/atoms/AppButton';
import { CameraOverlay } from '../../../components/organisms/CameraOverlay';
import { useCameraController } from '../../../controllers/useCameraController';
import { useDesignStore } from '../../../controllers/useDesignStore';
import { useEditorStore } from '../../../controllers/useEditorStore';
import { BODY_ZONES, BODY_ZONE_LABELS, type BodyZone } from '../../../models/bodyZone';
import { palette, type as typo, useTheme } from '../../../theme';

/**
 * Pantalla "Editor": camara en vivo + diseno superpuesto, con
 * controles para elegir zona del cuerpo y ajustar tamano/opacidad.
 * Desde aqui tambien se puede saltar a la vista de maniquin 3D, que
 * reutiliza la misma colocacion (useEditorStore).
 */
export default function TattooEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { permission, requestPermission, cameraRef, capture } = useCameraController();
  const designs = useDesignStore((s) => s.designs);
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);

  const styles = createStyles(colors);

  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Necesitamos permiso de camara para continuar</Text>
        <AppButton label="Dar permiso" onPress={requestPermission} />
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
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraOverlay cameraRef={cameraRef} design={design} />
        <View style={styles.floating}>
          <AppButton label="Ver en maniquí 3D" variant="secondary" compact onPress={() => router.push('/model3d')} />
        </View>
      </View>

      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
        <Text style={styles.label}>Zona del cuerpo</Text>
        <View style={styles.zoneList}>
          {BODY_ZONES.map((zone: BodyZone) => (
            <AppButton
              key={zone}
              label={BODY_ZONE_LABELS[zone]}
              variant="secondary"
              compact
              onPress={() => proposal.setZone(zone)}
              selected={proposal.bodyZone === zone}
            />
          ))}
        </View>

        <Text style={styles.label}>Tamano</Text>
        <Slider
          minimumValue={0.3}
          maximumValue={2.5}
          value={proposal.placement.scale}
          onValueChange={proposal.scale}
          minimumTrackTintColor={palette.fuchsia}
          maximumTrackTintColor={colors.borderStrong}
          thumbTintColor={palette.fuchsiaCore}
        />

        <Text style={styles.label}>Opacidad</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={proposal.placement.opacity}
          onValueChange={proposal.setOpacity}
          minimumTrackTintColor={palette.blue}
          maximumTrackTintColor={colors.borderStrong}
          thumbTintColor={palette.blueCore}
        />

        <AppButton label="Guardar propuesta" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
    permissionText: { ...typo.body, color: colors.text, textAlign: 'center' },
    cameraContainer: { flex: 1 },
    floating: { position: 'absolute', left: 16, right: 16, bottom: 16 },
    controls: { maxHeight: 320, backgroundColor: colors.header },
    controlsContent: { padding: 16, gap: 8 },
    label: { ...typo.sectionTitle, fontSize: 16, color: colors.textStrong, marginTop: 8 },
    zoneList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
