import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useEditorStore } from '../../controllers/useEditorStore';
import { useSettingsStore } from '../../controllers/useSettingsStore';
import { useZoneScanStore } from '../../controllers/useZoneScanStore';
import type { Placement } from '../../models/placement';
import { displayImageUrl, type TattooDesign } from '../../models/tattooDesign';
import { TRASH_CENTER_FROM_BOTTOM, TRASH_RADIUS } from '../../models/trashZone';
import { clampView, screenToContent, type Rect, type ScanView } from '../../models/zoneScan';
import { duration, easing } from '../../theme/motion';
import { BASE_SIZE, DesignOverlay, REFERENCE_SIZE } from '../molecules/DesignOverlay';
import { TrashTarget } from '../molecules/TrashTarget';
import { SkinWrapView } from './SkinWrapView';

/** Margen alrededor del diseno que todavia cuenta como "tocar el diseno". */
const DESIGN_HIT_MARGIN = 1.15;

/**
 * La foto de la zona ya tomada, para ajustar el tatuaje sobre ella SIN
 * modos ni botones: lo que hagan los dedos depende de donde empiezan.
 *
 * - Sobre el diseno: un dedo lo mueve, dos lo giran y cambian su tamaño,
 *   y arrastrarlo abajo al centro lo lleva al basurero (DesignOverlay).
 * - Fuera del diseno: pellizcar acerca o aleja la foto (hacia los
 *   dedos) y arrastrar la recorre.
 *
 * Mientras tanto el tatuaje se ve ya aplicado en la piel y curvado
 * (SkinWrapView), siguiendo al dedo en vivo. La foto y el tatuaje estan
 * en el mismo contenedor con zoom, asi que nada se despega al acercar;
 * el basurero va FUERA de ese contenedor, para que no crezca con el zoom.
 */
export function ZoneScanStage({
  uri,
  design,
  showDesign,
  fit,
  frame,
  exportRequest,
  onExported,
  onError,
  onRemoveDesign,
}: {
  uri: string;
  design?: TattooDesign;
  /** Sobre un resultado ya compuesto el diseno va dentro de la imagen. */
  showDesign: boolean;
  /** `cover` para la foto (asi se ve como en la camara en vivo). */
  fit: 'cover' | 'contain';
  /** Recuadro de la zona: es el miembro sobre el que se envuelve el boceto. */
  frame?: Rect;
  exportRequest?: number;
  onExported?: (dataUri: string) => void;
  onError?: (message: string) => void;
  /** Soltar el diseno en el basurero. */
  onRemoveDesign?: () => void;
}) {
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { view, skin, onSkin, setView } = useZoneScanStore();
  const placement = useEditorStore((s) => s.placement);
  const hideBackground = useEditorStore((s) => s.hideBackground);
  const wrapOnSkin = showDesign && onSkin && Boolean(design);
  const [live, setLive] = useState<Placement | null>(null);
  const shown = live ?? placement;

  const stageW = useSharedValue(0);
  const stageH = useSharedValue(0);
  // Donde esta el escenario en la ventana: el basurero se compara con
  // la posicion ABSOLUTA del dedo.
  const stageX = useSharedValue(0);
  const stageY = useSharedValue(0);
  const scale = useSharedValue(view.scale);
  const tx = useSharedValue(view.x);
  const ty = useSharedValue(view.y);
  const start = useSharedValue<ScanView>(view);
  const isGesturing = useSharedValue(false);

  // Donde esta el diseno (en coordenadas de la foto sin zoom) y que tan
  // grande es: para decidir si un toque empieza sobre el o sobre la foto.
  const designX = useSharedValue(0);
  const designY = useSharedValue(0);
  const designR = useSharedValue(0);
  const hasDesign = showDesign && Boolean(design);

  const trashVisible = useSharedValue(0);
  const trashHot = useSharedValue(0);
  const isOverTrash = (absX: number, absY: number) => {
    'worklet';
    const cx = stageX.value + stageW.value / 2;
    const cy = stageY.value + stageH.value - TRASH_CENTER_FROM_BOTTOM;
    return Math.hypot(absX - cx, absY - cy) <= TRASH_RADIUS;
  };

  const commit = (next: ScanView) => setView(next);
  const apply = (next: ScanView) => {
    'worklet';
    const v = clampView(next, { width: stageW.value, height: stageH.value });
    scale.value = v.scale;
    tx.value = v.x;
    ty.value = v.y;
  };
  const save = () => {
    'worklet';
    isGesturing.value = false;
    runOnJS(commit)({ scale: scale.value, x: tx.value, y: ty.value });
  };

  /** Si un punto de la pantalla cae sobre el diseno. */
  const onDesign = (x: number, y: number) => {
    'worklet';
    if (!hasDesign) return false;
    const p = screenToContent({ x, y }, { scale: scale.value, x: tx.value, y: ty.value }, { width: stageW.value, height: stageH.value });
    return Math.hypot(p.x - (stageW.value / 2 + designX.value), p.y - (stageH.value / 2 + designY.value)) <= designR.value;
  };

  // Los gestos de la foto se activan a mano: si el primer dedo cae sobre
  // el diseno, fallan y el toque es del diseno (DesignOverlay).
  const pinch = Gesture.Pinch()
    .manualActivation(true)
    .onTouchesDown((e, manager) => {
      if (e.numberOfTouches < 2) return;
      const [a, b] = e.allTouches;
      if (onDesign(a.x, a.y) || onDesign(b.x, b.y)) manager.fail();
    })
    .onTouchesMove((e, manager) => {
      if (e.numberOfTouches >= 2) manager.activate();
    })
    .onStart(() => {
      isGesturing.value = true;
      start.value = { scale: scale.value, x: tx.value, y: ty.value };
    })
    // Acercar hacia los dedos: el punto de la foto bajo el foco del
    // pellizco sigue bajo el foco mientras cambia la escala.
    .onUpdate((e) => {
      const cx = stageW.value / 2;
      const cy = stageH.value / 2;
      const s0 = start.value;
      const s1 = s0.scale * e.scale;
      const px = cx + (e.focalX - cx - s0.x) / s0.scale;
      const py = cy + (e.focalY - cy - s0.y) / s0.scale;
      apply({ scale: s1, x: e.focalX - cx - s1 * (px - cx), y: e.focalY - cy - s1 * (py - cy) });
    })
    .onEnd(save);

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e, manager) => {
      const t = e.allTouches[0];
      if (t && onDesign(t.x, t.y)) manager.fail();
    })
    .onTouchesMove((_e, manager) => {
      manager.activate();
    })
    .onStart(() => {
      isGesturing.value = true;
      start.value = { scale: scale.value, x: tx.value, y: ty.value };
    })
    .onUpdate((e) => {
      apply({ scale: scale.value, x: start.value.x + e.translationX, y: start.value.y + e.translationY });
    })
    .onEnd(save);

  const gesture = Gesture.Simultaneous(pinch, pan);

  // El store manda cuando cambia desde fuera (al tomar la foto se
  // enfoca la zona; "Ver la foto entera" vuelve a x1). Se anima: ese
  // acercamiento ES el escaneo que ve el usuario.
  useEffect(() => {
    if (isGesturing.value) return;
    const config = { duration: reduceMotion ? 0 : duration.slow * 2, easing: easing.standard };
    scale.value = withTiming(view.scale, config);
    tx.value = withTiming(view.x, config);
    ty.value = withTiming(view.y, config);
  }, [view, reduceMotion, isGesturing, scale, tx, ty]);

  // Posicion y tamaño del diseno para el reparto de toques.
  useEffect(() => {
    // Desplazamiento desde el centro del escenario; el centro se suma al tocar.
    designX.value = shown.offsetX * REFERENCE_SIZE;
    designY.value = shown.offsetY * REFERENCE_SIZE;
    designR.value = (BASE_SIZE / 2) * shown.scale * DESIGN_HIT_MARGIN;
  }, [shown, designX, designY, designR]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const stageRef = useRef<View>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    stageW.set(e.nativeEvent.layout.width);
    stageH.set(e.nativeEvent.layout.height);
    stageRef.current?.measureInWindow((x, y) => {
      stageX.set(x);
      stageY.set(y);
    });
  };

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View ref={stageRef} style={styles.fill} onLayout={onLayout} collapsable={false}>
          <Animated.View style={[styles.fill, zoomStyle]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={fit} />
            {wrapOnSkin && design && (
              <SkinWrapView
                photoUri={uri}
                designUri={displayImageUrl(design)}
                placement={shown}
                cutout={hideBackground}
                frame={frame}
                settings={skin}
                exportRequest={exportRequest}
                onExported={onExported}
                onError={onError}
              />
            )}
            {showDesign && (
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <DesignOverlay
                  design={design}
                  guide={wrapOnSkin}
                  onLivePlacement={wrapOnSkin ? setLive : undefined}
                  onRemove={onRemoveDesign}
                  externalTrash={onRemoveDesign ? { visible: trashVisible, hot: trashHot, isOver: isOverTrash } : undefined}
                />
              </View>
            )}
          </Animated.View>
        </View>
      </GestureDetector>
      {onRemoveDesign && <TrashTarget visible={trashVisible} hot={trashHot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
