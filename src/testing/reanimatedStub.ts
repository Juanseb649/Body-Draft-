/**
 * Sustituto de react-native-reanimated para tests de componentes.
 *
 * Reanimated necesita su runtime nativo (worklets), que en Jest no
 * existe, y su mock oficial tambien lo arrastra. Para pintar
 * componentes basta con que las animaciones sean valores quietos: en
 * estos tests se prueba que se muestra y que se dispara, no como se
 * anima. Uso:
 *
 *   jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));
 */
import { Text, View } from 'react-native';

const identity = <T>(v: T) => v;

export default { View, Text, createAnimatedComponent: identity };
export const Easing = { bezier: () => identity, linear: identity, quad: identity, inOut: () => identity };
export const useSharedValue = <T>(v: T) => ({ value: v, get: () => v, set: () => {} });
export const useAnimatedStyle = () => ({});
export const useAnimatedScrollHandler = () => () => {};
export const useAnimatedReaction = () => {};
export const withTiming = identity;
export const withSpring = identity;
export const withRepeat = identity;
export const withSequence = identity;
export const withDelay = (_: number, v: unknown) => v;
export const runOnJS = identity;
export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
