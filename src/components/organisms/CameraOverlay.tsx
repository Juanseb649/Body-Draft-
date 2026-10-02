import { CameraView } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { DesignOverlay } from '../molecules/DesignOverlay';
import type { TattooDesign } from '../../models/tattooDesign';

/**
 * Organismo: preview de camara en vivo con el boceto superpuesto
 * (ver DesignOverlay, que es quien maneja arrastre y colocacion).
 */
export function CameraOverlay({
  cameraRef,
  design,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  design?: TattooDesign;
}) {
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <DesignOverlay design={design} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
});
