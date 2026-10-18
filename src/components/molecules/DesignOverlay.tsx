import { useEffect } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';

import { useEditorStore } from '../../controllers/useEditorStore';
import type { TattooDesign } from '../../models/tattooDesign';
import { displayImageUrl } from '../../models/tattooDesign';
import { isOverTrash, TRASH_REVEAL_DRAG } from '../../models/trashZone';
import { TrashTarget } from './TrashTarget';

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
 * Deja transparente el papel de un boceto, en el dispositivo y al
 * instante.
 *
 * La matriz no toca el color (las tres primeras filas son la
 * identidad) y calcula el alfa como `1 - luminancia`: el papel blanco
 * sale con alfa 0 y la tinta negra con alfa 1. Los grises intermedios
 * quedan semitransparentes, que es justo lo que suaviza el borde del
 * trazo en vez de dejarlo dentado.
 *
 * Funciona bien con bocetos sobre papel claro, que es el caso normal.
 * Para una foto con fondo complicado esta aparte el recorte con IA
 * (AIService.removeBackground), que entiende la escena.
 */
const LUMINANCE_TO_ALPHA = ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0', '-0.33 -0.33 -0.33 0 1'].join(' ');

function CutoutImage({ uri }: { uri: string }) {
  return (
    <Svg width={BASE_SIZE} height={BASE_SIZE}>
      <Defs>
        <Filter id="cutout">
          <FeColorMatrix type="matrix" values={LUMINANCE_TO_ALPHA} />
        </Filter>
      </Defs>
      <SvgImage
        href={{ uri }}
        width={BASE_SIZE}
        height={BASE_SIZE}
        preserveAspectRatio="xMidYMid meet"
        filter="url(#cutout)"
      />
    </Svg>
  );
}

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
export function DesignOverlay({
  design,
  guide = false,
  onRemove,
}: {
  design?: TattooDesign;
  /**
   * Modo guia: el boceto de verdad lo dibuja otra capa (aplicado sobre
   * la piel, ver SkinWrapView). Aqui queda solo un fantasma con borde
   * punteado, que es lo que se agarra para moverlo, girarlo y escalarlo.
   */
  guide?: boolean;
  /**
   * Si se pasa, arrastrar el boceto hacia abajo hace aparecer un
   * basurero abajo al centro; soltarlo encima lo quita.
   */
  onRemove?: () => void;
}) {
  const placement = useEditorStore((s) => s.placement);
  const hideBackground = useEditorStore((s) => s.hideBackground);
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
  // Basurero: `trashVisible` lo muestra, `overTrash` es que el boceto ya esta encima.
  const trashVisible = useSharedValue(0);
  const overTrash = useSharedValue(0);
  const canRemove = Boolean(onRemove);

  const remove = () => onRemove?.();

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
      if (!canRemove) return;
      // Aparece solo al arrastrar HACIA ABAJO: mover el boceto hacia
      // los lados o hacia arriba no tiene por que mostrar un basurero.
      if (e.translationY > TRASH_REVEAL_DRAG && trashVisible.value === 0) trashVisible.value = withTiming(1, { duration: 180 });
      const over = isOverTrash(translateX.value, translateY.value, frameWidth.value, frameHeight.value);
      overTrash.value = over ? 1 : 0;
    })
    .onEnd(() => {
      if (canRemove && overTrash.value === 1) {
        // Cae dentro del basurero y desaparece; la posicion vuelve al
        // centro para el siguiente boceto.
        scale.value = withTiming(0, { duration: 160 });
        isGesturing.value = false;
        runOnJS(remove)();
        return;
      }
      save();
    })
    .onFinalize(() => {
      isGesturing.value = false;
      trashVisible.value = withTiming(0, { duration: 160 });
      overTrash.value = 0;
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
      // Encima del basurero se encoge: "esto se va".
      { scale: scale.value * (overTrash.value === 1 ? 0.55 : 1) },
    ],
    // En modo guia el fantasma se vuelve casi solido mientras hay un
    // dedo encima: la capa "en la piel" se actualiza al soltar, y sin
    // esto parecia que el boceto desaparecia al moverlo.
    ...(guide ? { opacity: isGesturing.value ? 0.85 : 0.22 } : null),
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    frameWidth.value = e.nativeEvent.layout.width;
    frameHeight.value = e.nativeEvent.layout.height;
  };

  if (!design) return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout} />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.wrapper, guide ? styles.guide : { opacity: placement.opacity }, style]}>
          {hideBackground ? (
            <CutoutImage uri={displayImageUrl(design)} />
          ) : (
            <Image source={{ uri: displayImageUrl(design) }} style={styles.design} resizeMode="contain" />
          )}
        </Animated.View>
      </GestureDetector>
      {canRemove && <TrashTarget visible={trashVisible} hot={overTrash} />}
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
  // Casi invisible pero con borde: se ve donde agarrarlo sin tapar
  // el tatuaje aplicado que hay debajo.
  guide: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FFFFFF',
    borderRadius: 12,
  },
});
