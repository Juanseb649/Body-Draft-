import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/** Anillo de carga 20px, trazo 2.5px, giro 800ms lineal (guia de animaciones #cargando). */
export function Spinner({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const r = size / 2 - 1.25;
  const circumference = 2 * Math.PI * r;

  return (
    <AnimatedSvg width={size} height={size} style={style}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.28} ${circumference}`}
        fill="none"
      />
    </AnimatedSvg>
  );
}
