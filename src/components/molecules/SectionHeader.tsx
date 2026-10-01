import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MenuButton } from '../atoms/MenuButton';
import { SectionIcon } from '../atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../atoms/sectionIcons';
import { SectionTitle } from './SectionLogo';

/**
 * Cabecera de una seccion del menu lateral: boton de menu + icono +
 * nombre. Las pantallas de drill-down (perfil de artista, agendar cita)
 * NO usan esta cabecera: van apiladas encima del drawer y llevan su
 * propio chevron de volver (ver ARCHITECTURE.md, "Navegacion").
 */
export function SectionHeader({
  section,
  right,
  style,
}: {
  section: SectionKey;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel={SECTIONS[section].label}>
      <MenuButton />
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
  title: { flex: 1 },
  right: { marginLeft: 8 },
});
