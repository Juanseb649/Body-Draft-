import { useEffect, useMemo } from 'react';
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
import { flashWallLayout, type FlashTile } from './flashSheet';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Largo de guion mayor que cualquier trazo de un motivo (caja de 200). */
const DASH = 720;
/** Retraso entre un motivo y el siguiente, en "motivos" de progreso. */
const STAGGER = 0.12;
const DRAW_MS_PER_UNIT = 700;

/**
 * La pared de flash del estudio, de fondo. Cada motivo se "tatua" trazo
 * a trazo al entrar (el guion del trazo corre como la aguja), en orden
 * desde arriba y desde el centro, y despues la pared se desliza muy
 * despacio para que la pantalla no se sienta congelada.
 *
 * Va apagada a proposito (opacidad baja): es la pared detras del
 * mostrador, no lo que se vino a leer. Con "Reducir animaciones" se
 * pinta entera y quieta.
 */
export function FlashWall({ delayMs = 0 }: { delayMs?: number }) {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const reduceMotion = useSettingsStore((s) => s.appearance.reduceMotion);
  const tiles = useMemo(() => flashWallLayout(width, height), [width, height]);
  const total = tiles.length * STAGGER + 1;
  const cell = tiles.length > 1 ? Math.abs(tiles[1].x - tiles[0].x) || 150 : 150;

  const progress = useSharedValue(reduceMotion ? total : 0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(total);
      drift.set(0);
      return;
    }
    progress.set(0);
    progress.set(
      withDelay(delayMs, withTiming(total, { duration: total * DRAW_MS_PER_UNIT * 0.35, easing: Easing.out(Easing.quad) })),
    );
    drift.set(withRepeat(withTiming(1, { duration: 48000, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, total, delayMs, progress, drift]);

  const driftStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -drift.get() * cell }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
        <Svg width={width} height={height + cell * 1.5}>
          {tiles.map((tile, i) => (
            <FlashTileView
              key={i}
              tile={tile}
              progress={progress}
              color={flatToneColor(scheme, tile.tone)}
              opacity={scheme === 'dark' ? 0.42 : 0.4}
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
  // El guion se hereda del <G> a sus trazos: un valor animado por
  // motivo, no uno por trazo.
  const animatedProps = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, progress.get() - tile.order * STAGGER));
    return { strokeDashoffset: DASH * (1 - local) };
  });

  const scale = tile.size / 200;
  return (
    <AnimatedG
      animatedProps={animatedProps}
      transform={`translate(${tile.x} ${tile.y}) rotate(${tile.rotation} ${tile.size / 2} ${tile.size / 2}) scale(${scale})`}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={2.4 / scale}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[DASH, DASH]}
      fill="none"
    >
      {tile.motif.paths.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </AnimatedG>
  );
}
