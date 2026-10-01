import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type as typo, useTheme } from '../../theme';

/** Control segmentado (Tema, Intensidad del neon) — guia "Ajustes". */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const styles = createStyles(colors);

  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.option,
              active &&
                (isDark
                  ? { backgroundColor: colors.surfaceRaised }
                  : { backgroundColor: colors.surface, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }),
            ]}
          >
            <Text style={[typo.buttonMedium, { color: active ? colors.primary : colors.textMuted }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSunken,
      borderRadius: 22,
      padding: 4,
      gap: 4,
    },
    option: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  });
}
