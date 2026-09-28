import Animated from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { NeonPath } from './NeonPath';
import { SECTIONS, type SectionKey } from './sectionIcons';
import { useNeonFlicker } from './useNeonFlicker';

const TONE_ORDER = { amber: 0, blue: 1, fuchsia: 2 } as const;

export function SectionIcon({ section, size = 220 }: { section: SectionKey; size?: number }) {
  const strokes = [...SECTIONS[section].strokes].sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
  const flicker = useNeonFlicker();

  return (
    <Animated.View style={flicker}>
      <Svg
        width={size}
        height={size}
        viewBox="-14 -14 228 228"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {strokes.map((s, i) => (
          <NeonPath key={i} d={s.d} tone={s.tone} strokeWidth={s.width ?? 5} transform={s.transform} />
        ))}
      </Svg>
    </Animated.View>
  );
}
