import { useEffect } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { displayImageUrl } from '../../models/tattooDesign';

/**
 * Unidad con la que `Placement.offsetX/offsetY` se guardan: son
 * relativos (0-1 aprox.) para que una propuesta se vea igual en
 * pantallas de distinto tamaño. En pantalla se multiplican por esto.
 */
const REFERENCE_SIZE = 300;

/** Lado del boceto sin escalar. */
const BASE_SIZE = 160;

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

/**
 * El boceto superpuesto, que se mueve, gira y se escala con los dedos.
 * Lee/escribe la colocacion en useEditorStore, asi que da igual si
 * debajo esta la camara o el maniquin: las dos vistas quedan
 * sincronizadas, y tambien con los deslizadores de la hoja inferior.
 *
 * Los gestos corren en el hilo de UI (Reanimated) y solo se escriben en
 * el store al soltar. Antes esto era un PanResponder que llamaba al
 * store en cada evento: cada frame cruzaba el puente y ademas sumaba
 * `gesture.dx`, que es el desplazamiento TOTAL desde que empezo el
 * gesto, no lo movido desde el frame anterior. Al acumularlo en cada
 * evento el desplazamiento crecia en progresion y el boceto salia
 * disparado fuera de la pantalla.
 */
export function DesignOverlay({ design }: { design?: TattooDesign }) {
  const placement = useEditorStore((s) => s.placement);
  const setPlacement = useEditorStore((s) => s.setPlacement);

  // Tamaño del area visible, para no dejar escapar el boceto.
  const frameWidth = useSharedValue(0);
  const frameHeight = useSharedValue(0);

  const translateX = useSharedValue(placement.offsetX * REFERENCE_SIZE);
  const translateY = useSharedValue(placement.offsetY * REFERENCE_SIZE);
  const scale = useSharedValue(placement.scale);
  const rotation = useSharedValue(placement.rotationDegrees);

  // Valor al empezar cada gesto: los gestos dan el acumulado desde su
  // inicio, asi que se suma sobre esto y no sobre el valor vivo.
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  const isGesturing = useSharedValue(false);

  const commit = (next: { x: number; y: number; scale: number; rotation: number }) => {
    setPlacement({
      offsetX: next.x / REFERENCE_SIZE,
      offsetY: next.y / REFERENCE_SIZE,
      scale: next.scale,
      rotationDegrees: next.rotation,
    });
  };

  const save = () => {
    'worklet';
    isGesturing.value = false;
    runOnJS(commit)({
      x: translateX.value,
      y: translateY.value,
      scale: scale.value,
      rotation: rotation.value,
    });
  };

  /** Limite de desplazamiento: siempre queda un trozo dentro. */
  const limitX = () => {
    'worklet';
    return Math.max(frameWidth.value / 2, 1);
  };
  const limitY = () => {
    'worklet';
    return Math.max(frameHeight.value / 2, 1);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      isGesturing.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    // `onChange` da lo movido desde el frame anterior, pero aqui se usa
    // `translation*`, que es el acumulado del gesto, sumado al valor con
    // el que empezo: asi el boceto sigue al dedo 1:1 y no se acumula de
    // mas si se pierde algun frame.
    .onUpdate((e) => {
      translateX.value = clamp(startX.value + e.translationX, -limitX(), limitX());
      translateY.value = clamp(startY.value + e.translationY, -limitY(), limitY());
    })
    .onEnd(save)
    .onFinalize(() => {
      isGesturing.value = false;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      isGesturing.value = true;
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(save);

  const rotate = Gesture.Rotation()
    .onStart(() => {
      isGesturing.value = true;
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + (e.rotation * 180) / Math.PI;
    })
    .onEnd(save);

  // Doble toque: vuelve al centro, sin tamaño ni giro. Es la salida
  // cuando el boceto se queda en una posicion imposible de recuperar.
  const reset = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      rotation.value = withSpring(0);
      runOnJS(commit)({ x: 0, y: 0, scale: 1, rotation: 0 });
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate, reset);

  // Los deslizadores de tamaño y opacidad siguen escribiendo en el
  // store, asi que hay que reflejarlos aqui. Mientras hay un dedo
  // encima mandan los gestos, o el valor del store pisaria el
  // movimiento en curso.
  //
  // Va despues de los gestos a proposito: la regla de inmutabilidad de
  // Reanimated solo permite escribir un shared value antes del efecto
  // que lo lee.
  useEffect(() => {
    if (isGesturing.value) return;
    translateX.value = placement.offsetX * REFERENCE_SIZE;
    translateY.value = placement.offsetY * REFERENCE_SIZE;
    scale.value = placement.scale;
    rotation.value = placement.rotationDegrees;
  }, [placement, isGesturing, translateX, translateY, scale, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    frameWidth.value = e.nativeEvent.layout.width;
    frameHeight.value = e.nativeEvent.layout.height;
  };

  if (!design) return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout} />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.wrapper, style, { opacity: placement.opacity }]}>
          <Image source={{ uri: displayImageUrl(design) }} style={styles.design} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -BASE_SIZE / 2,
    marginTop: -BASE_SIZE / 2,
  },
  design: { width: BASE_SIZE, height: BASE_SIZE },
});
