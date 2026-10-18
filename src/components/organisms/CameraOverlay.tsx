import { CameraView } from 'expo-camera';
import { StyleSheet, View } from 'react-native';

import { useEditorStore } from '../../controllers/useEditorStore';
import { useZoneScanStore } from '../../controllers/useZoneScanStore';
import { displayImageUrl, type TattooDesign } from '../../models/tattooDesign';
import type { Rect } from '../../models/zoneScan';
import { DesignOverlay } from '../molecules/DesignOverlay';
import { ScanFrame } from '../molecules/ScanFrame';
import { SkinWrapView } from './SkinWrapView';

/**
 * Organismo: preview de camara en vivo con el recuadro de la zona y el
 * boceto.
 *
 * El recuadro no es decorativo: es el miembro. Su centro es el eje y su
 * ancho el diametro del cilindro sobre el que SkinWrapView envuelve el
 * boceto, asi que ya en vivo se ve curvarse con el brazo. Encima va
 * DesignOverlay en modo guia, que es lo que se agarra con los dedos.
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
  const placement = useEditorStore((s) => s.placement);
  const hideBackground = useEditorStore((s) => s.hideBackground);
  const skin = useZoneScanStore((s) => s.skin);
  const onSkin = useZoneScanStore((s) => s.onSkin);
  const wrap = onSkin && Boolean(design);

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {scanFrame && <ScanFrame frame={scanFrame} label={scanLabel} />}
      {wrap && design && (
        <SkinWrapView
          photoUri={null}
          designUri={displayImageUrl(design)}
          placement={placement}
          cutout={hideBackground}
          frame={scanFrame}
          settings={skin}
        />
      )}
      <DesignOverlay design={design} guide={wrap} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
});
