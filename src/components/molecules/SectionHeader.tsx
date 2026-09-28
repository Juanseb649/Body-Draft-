import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SectionIcon } from '../atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../atoms/sectionIcons';
import { fonts, useTheme } from '../../theme';
import { SectionTitle } from './SectionLogo';

/**
 * Cabecera reutilizable de una seccion: chevron de volver + icono + nombre
 * (con glow), usada por las pantallas que antes vivian detras de la barra
 * de pestanas inferior. Ahora que la navegacion es un dashboard (ver
 * ARCHITECTURE.md, "Navegacion"), cada seccion necesita su propio camino
 * de vuelta.
 */
export function SectionHeader({
  section,
  onBack,
  right,
  style,
}: {
  section: SectionKey;
  onBack?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel={SECTIONS[section].label}>
      <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Volver">
        <Text style={[styles.chevron, { color: colors.textStrong }]}>‹</Text>
      </Pressable>
      <SectionIcon section={section} size={36} />
      <View style={styles.title}>
        <SectionTitle section={section} />
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  chevron: { fontSize: 28, fontFamily: fonts.display, lineHeight: 32 },
  title: { flex: 1 },
  right: { marginLeft: 8 },
});
