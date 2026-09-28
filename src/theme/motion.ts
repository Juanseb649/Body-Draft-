import { Easing } from 'react-native-reanimated';

/** Duraciones y curvas exactas de la guia de diseno (src/theme/motion.ts). */
export const duration = {
  fast: 120,
  base: 200,
  slow: 320,
  intro: 900,
} as const;

export const easing = {
  standard: Easing.bezier(0.2, 0.8, 0.2, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const spring = {
  press: { damping: 15, stiffness: 300 },
} as const;

/** Escala al presionar (animaciones #4 de la guia). */
export const PRESS_SCALE = 0.97;
