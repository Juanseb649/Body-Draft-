import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { Image, PanResponder, StyleSheet, View } from 'react-native';

import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { displayImageUrl } from '../../models/tattooDesign';

const REFERENCE_SIZE = 300;

/**
 * Organismo: preview de camara en vivo con el diseno superpuesto,
 * arrastrable con el dedo. Lee/escribe la colocacion directamente en
 * useEditorStore para que la vista de maniquin 3D quede sincronizada
 * con lo que el usuario ajusto aqui.
 */
export function CameraOverlay({
  cameraRef,
  design,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  design?: TattooDesign;
}) {
  const placement = useEditorStore((s) => s.placement);
  const move = useEditorStore((s) => s.move);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        move(gesture.dx / (REFERENCE_SIZE * 20), gesture.dy / (REFERENCE_SIZE * 20));
      },
    }),
  );

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {design && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View
            {...panResponder.panHandlers}
            style={[
              styles.designWrapper,
              {
                transform: [
                  { translateX: placement.offsetX * REFERENCE_SIZE },
                  { translateY: placement.offsetY * REFERENCE_SIZE },
                  { rotate: `${placement.rotationDegrees}deg` },
                  { scale: placement.scale },
                ],
                opacity: placement.opacity,
              },
            ]}
          >
            <Image source={{ uri: displayImageUrl(design) }} style={styles.design} resizeMode="contain" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  designWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -80,
    marginTop: -80,
  },
  design: { width: 160, height: 160 },
});
