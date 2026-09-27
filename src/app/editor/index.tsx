import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/atoms/AppButton';
import { CameraOverlay } from '../../components/organisms/CameraOverlay';
import { useCameraController } from '../../controllers/useCameraController';
import { useDesignStore } from '../../controllers/useDesignStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONES, BODY_ZONE_LABELS, type BodyZone } from '../../models/bodyZone';

/**
 * Pantalla "Editor": camara en vivo + diseno superpuesto, con
 * controles para elegir zona del cuerpo y ajustar tamano/opacidad.
 * Desde aqui tambien se puede saltar a la vista de maniquin 3D, que
 * reutiliza la misma colocacion (useEditorStore).
 */
export default function TattooEditorScreen() {
  const router = useRouter();
  const { permission, requestPermission, cameraRef, capture } = useCameraController();
  const designs = useDesignStore((s) => s.designs);
  const proposal = useEditorStore((s) => s);
  const design = designs.find((d) => d.id === proposal.designId);

  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Necesitamos permiso de camara para continuar</Text>
        <Button title="Dar permiso" onPress={requestPermission} />
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
        <AppButton label="Ver en maniquin 3D" onPress={() => router.push('/model3d')} />
      </View>

      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
        <Text style={styles.label}>Zona del cuerpo</Text>
        <View style={styles.zoneList}>
          {BODY_ZONES.map((zone: BodyZone) => (
            <AppButton
              key={zone}
              label={BODY_ZONE_LABELS[zone]}
              onPress={() => proposal.setZone(zone)}
              disabled={proposal.bodyZone === zone}
            />
          ))}
        </View>

        <Text style={styles.label}>Tamano</Text>
        <Slider
          minimumValue={0.3}
          maximumValue={2.5}
          value={proposal.placement.scale}
          onValueChange={proposal.scale}
        />

        <Text style={styles.label}>Opacidad</Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          value={proposal.placement.opacity}
          onValueChange={proposal.setOpacity}
        />

        <AppButton label="Guardar propuesta" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  permissionText: { textAlign: 'center' },
  cameraContainer: { flex: 1 },
  controls: { maxHeight: 320 },
  controlsContent: { padding: 16, gap: 8 },
  label: { fontWeight: '600', marginTop: 8 },
  zoneList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
