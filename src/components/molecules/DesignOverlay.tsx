import { useState } from 'react';
import { Image, PanResponder, StyleSheet, View } from 'react-native';

import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { displayImageUrl } from '../../models/tattooDesign';

const REFERENCE_SIZE = 300;

/**
 * El boceto superpuesto y arrastrable con el dedo. Lee/escribe la
 * colocacion en useEditorStore, asi que da igual si debajo esta la
 * camara o el maniquin: las dos vistas quedan sincronizadas.
 */
export function DesignOverlay({ design }: { design?: TattooDesign }) {
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

  if (!design) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        {...panResponder.panHandlers}
        style={[
          styles.wrapper,
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -80,
    marginTop: -80,
  },
  design: { width: 160, height: 160 },
});
