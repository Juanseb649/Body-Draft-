import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MenuButton } from '../atoms/MenuButton';
import { SectionIcon } from '../atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../atoms/sectionIcons';

/** Ancho de los lados: igual a izquierda y derecha para que el logo quede en el centro exacto. */
const SIDE = 44;

/**
 * Cabecera de una seccion del menu lateral: boton de menu a la
 * izquierda y SOLO el logo (icono) de la seccion, centrado. El nombre
 * ya no se escribe al lado: lo dice el propio logo y queda como
 * etiqueta para lectores de pantalla.
 *
 * Las pantallas de drill-down (perfil de artista, agendar cita) NO
 * usan esta cabecera: van apiladas encima del drawer y llevan su propio
 * chevron de volver (ver ARCHITECTURE.md, "Navegacion").
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
    <View style={[styles.row, style]}>
      <View style={styles.side}>
        <MenuButton />
      </View>
      <View style={styles.center} accessible accessibilityRole="header" accessibilityLabel={SECTIONS[section].label}>
        <SectionIcon section={section} size={44} />
      </View>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { width: SIDE, minHeight: SIDE, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
