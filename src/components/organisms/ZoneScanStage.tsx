import { useEffect } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useSettingsStore } from '../../controllers/useSettingsStore';
import { useZoneScanStore, type Stroke } from '../../controllers/useZoneScanStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { clampView, screenToContent, strokeToPath, type Point, type ScanView } from '../../models/zoneScan';
import { flatToneColor, neonLightCore, neonLightHaloColor, useTheme } from '../../theme';
import { duration, easing } from '../../theme/motion';
import { DesignOverlay } from '../molecules/DesignOverlay';

/** Grosor del perfil en pantalla, igual con o sin zoom. */
const LINE_WIDTH = 3;

/**
 * La foto de la zona ya tomada, para trabajar sobre ella:
 *
 * - "Ampliar": pellizcar acerca (hacia donde estan los dedos) y
 *   arrastrar recorre; doble toque alterna entre la foto entera y x2,5.
 * - "Perfilar": un dedo dibuja el perfil del tatuaje en neon; dos
 *   dedos siguen acercando, para perfilar el detalle de cerca.
 * - "Boceto": los dedos vuelven a mover el boceto (DesignOverlay).
 *
 * La foto, el boceto y los trazos estan dentro del MISMO contenedor
 * con zoom: al acercar crecen juntos y nada se despega de la piel.
 * Como en DesignOverlay, los gestos corren en el hilo de UI y solo
 * tocan el store al soltar (salvo el trazo, que se ve mientras se
 * dibuja).
 */
export function ZoneScanStage({
  uri,
  design,
  showDesign,
  fit,
}: {
  uri: string;
  design?: TattooDesign;
  /** Sobre el resultado de la IA el boceto ya va dentro de la imagen. */
  showDesign: boolean;
  /** `cover` para la foto (asi se ve como en la camara en vivo). */
  fit: 'cover' | 'contain';
}) {
  const { scheme } = useTheme();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const { tool, view, strokes, current, setView, beginStroke, extendStroke, endStroke } = useZoneScanStore();

  const stageW = useSharedValue(0);
  const stageH = useSharedValue(0);
  const scale = useSharedValue(view.scale);
  const tx = useSharedValue(view.x);
  const ty = useSharedValue(view.y);
  const start = useSharedValue<ScanView>(view);
  const isGesturing = useSharedValue(false);

  const zoomEnabled = tool !== 'boceto';

  const commit = (next: ScanView) => setView(next);
  const toContent = (p: Point) => {
    'worklet';
    return screenToContent(p, { scale: scale.value, x: tx.value, y: ty.value }, { width: stageW.value, height: stageH.value });
  };
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

  // Acercar hacia los dedos: el punto de la foto bajo el foco del
  // pellizco sigue bajo el foco mientras cambia la escala.
  const pinch = Gesture.Pinch()
    .enabled(zoomEnabled)
    .onStart(() => {
      isGesturing.value = true;
      start.value = { scale: scale.value, x: tx.value, y: ty.value };
    })
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

  // Recorrer con zoom. En "perfilar" el arrastre de un dedo es dibujar,
  // asi que ahi recorrer pide dos dedos.
  const pan = Gesture.Pan()
    .enabled(zoomEnabled)
    .minPointers(tool === 'perfilar' ? 2 : 1)
    .onStart(() => {
      isGesturing.value = true;
      start.value = { scale: scale.value, x: tx.value, y: ty.value };
    })
    .onUpdate((e) => {
      apply({ scale: scale.value, x: start.value.x + e.translationX, y: start.value.y + e.translationY });
    })
    .onEnd(save);

  const draw = Gesture.Pan()
    .enabled(tool === 'perfilar')
    .maxPointers(1)
    .minDistance(0)
    .onBegin((e) => {
      runOnJS(beginStroke)(toContent({ x: e.x, y: e.y }));
    })
    .onUpdate((e) => {
      runOnJS(extendStroke)(toContent({ x: e.x, y: e.y }));
    })
    .onFinalize(() => {
      runOnJS(endStroke)();
    });

  const doubleTap = Gesture.Tap()
    .enabled(tool === 'ampliar')
    .numberOfTaps(2)
    .onEnd((e) => {
      const cx = stageW.value / 2;
      const cy = stageH.value / 2;
      const target =
        scale.value > 1.05
          ? { scale: 1, x: 0, y: 0 }
          : { scale: 2.5, x: -2.5 * (e.x - cx) + (e.x - cx), y: -2.5 * (e.y - cy) + (e.y - cy) };
      const v = clampView(target, { width: stageW.value, height: stageH.value });
      scale.value = withTiming(v.scale, { duration: duration.slow });
      tx.value = withTiming(v.x, { duration: duration.slow });
      ty.value = withTiming(v.y, { duration: duration.slow });
      runOnJS(commit)(v);
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan), draw);

  // El store manda cuando cambia desde fuera (al tomar la foto se
  // enfoca la zona; "Ver entera" vuelve a x1). Se anima: ese
  // acercamiento ES el escaneo que ve el usuario. Va despues de los
  // gestos por la regla de inmutabilidad de Reanimated.
  useEffect(() => {
    if (isGesturing.value) return;
    const config = { duration: reduceMotion ? 0 : duration.slow * 2, easing: easing.standard };
    scale.value = withTiming(view.scale, config);
    tx.value = withTiming(view.x, config);
    ty.value = withTiming(view.y, config);
  }, [view, reduceMotion, isGesturing, scale, tx, ty]);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    stageW.value = e.nativeEvent.layout.width;
    stageH.value = e.nativeEvent.layout.height;
  };

  const strokeWidth = LINE_WIDTH / view.scale;
  const renderStroke = (stroke: Stroke, key: string) => {
    const d = strokeToPath(stroke.points);
    const core = scheme === 'light' ? neonLightCore(stroke.tone) : flatToneColor('dark', stroke.tone);
    const halo = scheme === 'light' ? neonLightHaloColor(stroke.tone, 0.45) : undefined;
    return <SvgStroke key={key} d={d} core={core} halo={halo} width={strokeWidth} />;
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} onLayout={onLayout} collapsable={false}>
        <Animated.View style={[styles.fill, zoomStyle]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={fit} />
          {showDesign && (
            <View style={StyleSheet.absoluteFill} pointerEvents={tool === 'boceto' ? 'box-none' : 'none'}>
              <DesignOverlay design={design} />
            </View>
          )}
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {strokes.map((s, i) => renderStroke(s, `s${i}`))}
            {current && renderStroke(current, 'current')}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/**
 * Un trazo de neon. En claro: halo ancho y translucido + nucleo (el
 * "tubo" de la guia). En oscuro, plano como pide la guia.
 */
function SvgStroke({ d, core, halo, width }: { d: string; core: string; halo?: string; width: number }) {
  return (
    <>
      {halo && <Path d={d} stroke={halo} strokeWidth={width * 3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <Path d={d} stroke={core} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
});
