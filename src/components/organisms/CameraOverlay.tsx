import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useEditorStore } from '../../controllers/useEditorStore';
import { useZoneScanStore } from '../../controllers/useZoneScanStore';
import type { Placement } from '../../models/placement';
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
  onRemoveDesign,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  design?: TattooDesign;
  /** Sin medir todavia el escenario no hay recuadro. */
  scanFrame?: Rect;
  scanLabel: string;
  /** Arrastrar el boceto al basurero (abajo al centro) lo quita. */
  onRemoveDesign?: () => void;
}) {
  const placement = useEditorStore((s) => s.placement);
  const hideBackground = useEditorStore((s) => s.hideBackground);
  const skin = useZoneScanStore((s) => s.skin);
  const onSkin = useZoneScanStore((s) => s.onSkin);
  const wrap = onSkin && Boolean(design);
  // Mientras se arrastra, la piel sigue al dedo con la colocacion en vivo.
  const [live, setLive] = useState<Placement | null>(null);

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {scanFrame && <ScanFrame frame={scanFrame} label={scanLabel} />}
      {wrap && design && (
        <SkinWrapView
          photoUri={null}
          designUri={displayImageUrl(design)}
          placement={live ?? placement}
          cutout={hideBackground}
          frame={scanFrame}
          settings={skin}
        />
      )}
      <DesignOverlay
        design={design}
        guide={wrap}
        onRemove={onRemoveDesign}
        onLivePlacement={wrap ? setLive : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
});
