import { Pressable, StyleSheet, Text } from 'react-native';

import { flatToneColor, type as typo, useTheme, type GlowTone } from '../../theme';

/** Chip seleccionable (estilos, zonas, horarios) — animacion #6 de la guia. */
export function Chip({
  label,
  selected,
  onPress,
  tone = 'blue',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: GlowTone;
}) {
  const { colors, scheme } = useTheme();
  const fill = flatToneColor(scheme, tone);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: fill, borderColor: fill }
          : { backgroundColor: 'transparent', borderColor: colors.border },
      ]}
    >
      <Text style={[typo.buttonMedium, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
