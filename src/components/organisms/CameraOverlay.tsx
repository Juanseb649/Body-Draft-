import { CameraView } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { DesignOverlay } from '../molecules/DesignOverlay';
import { ScanFrame } from '../molecules/ScanFrame';
import type { TattooDesign } from '../../models/tattooDesign';
import type { Rect } from '../../models/zoneScan';

/**
 * Organismo: preview de camara en vivo con el recuadro guia de la zona
 * (ScanFrame) y el boceto superpuesto (DesignOverlay, que maneja
 * arrastre y colocacion). El recuadro va debajo del boceto: es una
 * guia, no tiene que tapar lo que se esta probando.
 */
export function CameraOverlay({
  cameraRef,
  design,
  scanFrame,
  scanLabel,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  design?: TattooDesign;
  /** Sin medir todavia el escenario no hay recuadro. */
  scanFrame?: Rect;
  scanLabel: string;
}) {
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {scanFrame && <ScanFrame frame={scanFrame} label={scanLabel} />}
      <DesignOverlay design={design} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
});
