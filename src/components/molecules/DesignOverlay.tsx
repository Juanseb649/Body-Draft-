import { useEffect } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';

import { useEditorStore } from '../../controllers/useEditorStore';
import type { Placement } from '../../models/placement';
import type { TattooDesign } from '../../models/tattooDesign';
import { displayImageUrl } from '../../models/tattooDesign';
import { isOverTrash, TRASH_REVEAL_DRAG } from '../../models/trashZone';
import { TrashTarget } from './TrashTarget';

/**
 * Unidad con la que `Placement.offsetX/offsetY` se guardan: son
 * relativos (0-1 aprox.) para que una propuesta se vea igual en
 * pantallas de distinto tamaño. En pantalla se multiplican por esto.
 */
export const REFERENCE_SIZE = 300;

/** Lado del boceto sin escalar. */
export const BASE_SIZE = 160;

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
  onLivePlacement,
  externalTrash,
}: {
  design?: TattooDesign;
  /**
   * Modo guia: el boceto de verdad lo dibuja otra capa (aplicado sobre
   * la piel, ver SkinWrapView). Aqui queda una zona INVISIBLE con su
   * forma, que es lo que se agarra para moverlo, girarlo y escalarlo:
   * no se ve ningun boceto plano ni marco encima del tatuaje.
   */
  guide?: boolean;
  /**
   * Mientras hay un dedo encima, la colocacion en vivo (unas 30 veces por
   * segundo), para que la capa "en la piel" siga al dedo ya curvada en
   * vez de saltar al soltar. Al terminar el gesto llega null.
   */
  onLivePlacement?: (placement: Placement | null) => void;
  /**
   * Si se pasa, arrastrar el boceto hacia abajo hace aparecer un
   * basurero abajo al centro; soltarlo encima lo quita.
   */
  onRemove?: () => void;
  /**
   * Basurero dibujado FUERA de este componente (p. ej. fuera del
   * contenedor con zoom de la foto, para que no crezca con el zoom).
   * Se le pasan sus valores y como saber, por la posicion del dedo en
   * la ventana, si esta encima. Sin esto, el basurero va aqui dentro.
   */
  externalTrash?: {
    visible: SharedValue<number>;
    hot: SharedValue<number>;
    isOver: (absoluteX: number, absoluteY: number) => boolean;
  };
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
  const ownTrashVisible = useSharedValue(0);
  const ownOverTrash = useSharedValue(0);
  const trashVisible = externalTrash?.visible ?? ownTrashVisible;
  const overTrash = externalTrash?.hot ?? ownOverTrash;
  const isOverExternal = externalTrash?.isOver;
  const canRemove = Boolean(onRemove);

  const remove = () => onRemove?.();

  // Colocacion en vivo, un fotograma si y otro no (~30/s): suficiente
  // para que la piel siga al dedo sin saturar el puente con el WebView.
  const liveTick = useSharedValue(0);
  const emitLiveJS = (next: { x: number; y: number; scale: number; rotation: number }) =>
    onLivePlacement?.({
      offsetX: next.x / REFERENCE_SIZE,
      offsetY: next.y / REFERENCE_SIZE,
      scale: next.scale,
      rotationDegrees: next.rotation,
      opacity: placement.opacity,
    });
  const endLiveJS = () => onLivePlacement?.(null);
  const hasLive = Boolean(onLivePlacement);
  const emitLive = () => {
    'worklet';
    if (!hasLive) return;
    liveTick.value += 1;
    if (liveTick.value % 2 !== 0) return;
    runOnJS(emitLiveJS)({
      x: translateX.value,
      y: translateY.value,
      // Encima del basurero se encoge tambien la capa en la piel.
      scale: scale.value * (overTrash.value === 1 ? 0.55 : 1),
      rotation: rotation.value,
    });
  };

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
      const over = isOverExternal
        ? isOverExternal(e.absoluteX, e.absoluteY)
        : isOverTrash(translateX.value, translateY.value, frameWidth.value, frameHeight.value);
      overTrash.value = over ? 1 : 0;
    })
    .onChange(() => emitLive())
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
      if (hasLive) runOnJS(endLiveJS)();
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      isGesturing.value = true;
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      emitLive();
    })
    .onEnd(save)
    .onFinalize(() => {
      if (hasLive) runOnJS(endLiveJS)();
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      isGesturing.value = true;
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + (e.rotation * 180) / Math.PI;
      emitLive();
    })
    .onEnd(save)
    .onFinalize(() => {
      if (hasLive) runOnJS(endLiveJS)();
    });

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
    // En modo guia no se ve nada: lo que se ve es el tatuaje en la piel,
    // que sigue al dedo (onLivePlacement). Sin capa de ayuda encima.
    ...(guide ? { opacity: 0 } : null),
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    frameWidth.value = e.nativeEvent.layout.width;
    frameHeight.value = e.nativeEvent.layout.height;
  };

  if (!design) return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout} />;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.wrapper, guide ? null : { opacity: placement.opacity }, style]}>
          {hideBackground ? (
            <CutoutImage uri={displayImageUrl(design)} />
          ) : (
            <Image source={{ uri: displayImageUrl(design) }} style={styles.design} resizeMode="contain" />
          )}
        </Animated.View>
      </GestureDetector>
      {canRemove && !externalTrash && <TrashTarget visible={trashVisible} hot={overTrash} />}
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
