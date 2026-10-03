import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../atoms/AppButton';
import { Icon } from '../atoms/Icon';
import { type as typo, useTheme } from '../../theme';

/**
 * Lo unico de toda la app que saca una foto del usuario de su telefono.
 *
 * Por eso se pregunta de forma explicita y en terminos claros, en vez
 * de esconderlo en unos terminos y condiciones: la persona tiene que
 * poder decir que no y seguir usando la app igual, que es justo lo que
 * pasa (la vista previa en vivo y el maniquin 3D no mandan nada).
 */
export function AiPhotoConsentModal({
  visible,
  onAccept,
  onCancel,
}: {
  visible: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={[typo.title, { color: colors.textStrong, flex: 1 }]}>Esta foto saldrá de tu teléfono</Text>
            <Pressable onPress={onCancel} hitSlop={12} accessibilityLabel="Cancelar">
              <Icon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[typo.body, { color: colors.text }]}>
            Para que el tatuaje siga la curvatura y la luz de tu piel, la foto que acabas de tomar y tu boceto se envían
            a la IA de Google, que devuelve la imagen recompuesta.
          </Text>

          <View style={styles.points}>
            <Text style={[typo.body, { color: colors.textMuted }]}>
              · Solo ocurre cuando tú lo pides. Nunca mientras la cámara está abierta.
            </Text>
            <Text style={[typo.body, { color: colors.textMuted }]}>
              · Si dices que no, sigues teniendo la vista previa en vivo y el maniquí 3D, que funcionan dentro del
              teléfono.
            </Text>
            <Text style={[typo.body, { color: colors.textMuted }]}>
              · Puedes revocarlo cuando quieras desde Ajustes.
            </Text>
          </View>

          <AppButton label="Aceptar y continuar" onPress={onAccept} />
          <Pressable onPress={onCancel} hitSlop={8} style={styles.cancel}>
            <Text style={[typo.bodyStrong, { color: colors.textMuted }]}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 16,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    points: { gap: 8 },
    cancel: { alignItems: 'center', paddingVertical: 4 },
  });
}
