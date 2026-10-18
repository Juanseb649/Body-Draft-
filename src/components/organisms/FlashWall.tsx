import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { useSettingsStore } from '../../controllers/useSettingsStore';
import { flatToneColor, useTheme } from '../../theme';
import { flashCellSize, flashWallLayout, type ClearArea, type FlashTile } from './flashSheet';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Largo de guion mayor que cualquier trazo de un motivo (caja de 200). */
const DASH = 900;
/** Retraso entre un motivo y el siguiente, en "motivos" de progreso. */
const STAGGER = 0.1;
/** Grosor de linea en pantalla, en px, con peso 1. */
const LINE = 2.2;

/**
 * La pared de flash del estudio, de fondo (bienvenida, login, registro).
 * Cada motivo se "tatua" trazo a trazo al entrar (el guion del trazo
 * corre como la aguja) y los rellenos tribales y blackwork se entintan
 * al terminar su contorno; despues la pared se desliza muy despacio
 * para que la pantalla no se sienta congelada.
 *
 * `clear` deja libre la zona del logo, tambien durante el
 * deslizamiento. Con "Reducir animaciones" se pinta entera y quieta.
 */
export function FlashWall({
  delayMs = 0,
  clear,
  dim,
}: {
  delayMs?: number;
  /** Zona sin motivos (el logo). */
  clear?: ClearArea;
  /** Zona con motivos apagados (detras del formulario o los botones). */
  dim?: ClearArea;
}) {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const cell = flashCellSize(width);
  // Medio motivo de recorrido: suficiente para que la pared respire,
  // sin obligar a vaciar una franja grande bajo el logo.
  const drift = reduceMotion ? 0 : cell * 0.5;
  const tiles = useMemo(
    () => flashWallLayout(width, height, { clear, dim, drift }),
    // `clear` y `dim` llegan como objetos nuevos en cada render; se comparan por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, drift, clear?.x, clear?.y, clear?.width, clear?.height, dim?.x, dim?.y, dim?.width, dim?.height],
  );
  const total = tiles.length * STAGGER + 1;

  const progress = useSharedValue(reduceMotion ? total : 0);
  const glide = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(total);
      glide.set(0);
      return;
    }
    progress.set(0);
    progress.set(withDelay(delayMs, withTiming(total, { duration: 1800, easing: Easing.out(Easing.quad) })));
    glide.set(withRepeat(withTiming(1, { duration: 52000, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, total, delayMs, progress, glide]);

  const glideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -glide.get() * drift }] }));
  const opacity = scheme === 'dark' ? 0.42 : 0.4;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      aria-hidden
    >
      <Animated.View style={[StyleSheet.absoluteFill, glideStyle]}>
        <Svg width={width} height={height + cell * 1.5}>
          {tiles.map((tile, i) => (
            <FlashTileView
              key={i}
              tile={tile}
              progress={progress}
              color={flatToneColor(scheme, tile.tone)}
              opacity={tile.dimmed ? opacity * 0.38 : opacity}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

function FlashTileView({
  tile,
  progress,
  color,
  opacity,
}: {
  tile: FlashTile;
  progress: SharedValue<number>;
  color: string;
  opacity: number;
}) {
  // El guion y la opacidad del relleno se heredan del <G> a sus trazos:
  // un valor animado por motivo, no uno por trazo.
  const animatedProps = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, progress.get() - tile.order * STAGGER));
    // El relleno entra en el ultimo tercio: primero el contorno, despues la tinta.
    const ink = Math.min(1, Math.max(0, (local - 0.65) / 0.35));
    return { strokeDashoffset: DASH * (1 - local), fillOpacity: ink * opacity * 0.85 };
  });

  const scale = tile.size / 200;
  return (
    <AnimatedG
      animatedProps={animatedProps}
      transform={`translate(${tile.x} ${tile.y}) rotate(${tile.rotation} ${tile.size / 2} ${tile.size / 2}) scale(${scale})`}
      stroke={color}
      fill={color}
      strokeOpacity={opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[DASH, DASH]}
    >
      {tile.motif.strokes.map((stroke, i) => (
        <Path
          key={i}
          d={stroke.d}
          strokeWidth={(LINE * (stroke.weight ?? 1)) / scale}
          {...(stroke.fill ? null : { fill: 'none' })}
        />
      ))}
    </AnimatedG>
  );
}

/**
 * Mide donde quedo el logo EN LA PANTALLA para dejarle libre esa zona
 * de la pared: `ref` y `onLayout` van en la caja del logo, `clear` en
 * <FlashWall>. Con margen, para que ningun motivo le roce el borde.
 * (measureInWindow y no el layout: ese es relativo al padre, y el logo
 * vive dentro de cabeceras y scrolls.)
 */
export function useFlashClearArea(margin = 12) {
  const node = useRef<View | null>(null);
  const [clear, setClear] = useState<ClearArea | undefined>(undefined);
  // Ref por callback (una funcion, no el objeto ref) para que la
  // pantalla no lea un ref durante el render.
  const ref = (view: View | null) => {
    node.current = view;
  };
  const measure = () => {
    node.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setClear({ x: x - margin, y: y - margin, width: width + margin * 2, height: height + margin * 2 });
    });
  };
  const onLayout = () => {
    measure();
    // Otra vez cuando termina la entrada: mientras sube (FadeInDown) la
    // caja esta desplazada y la zona libre quedaria corrida.
    setTimeout(measure, 1600);
  };
  return { ref, clear, onLayout };
}
