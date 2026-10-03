import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../atoms/AppButton';
import { Icon, type IconName } from '../atoms/Icon';
import { type as typo, useTheme } from '../../theme';

type Step = { icon: IconName; title: string; body: string };

/**
 * Lo que hace cada control de "Crea", y —esto es lo importante— por
 * que la pantalla pide la camara y el carrete.
 *
 * Se explica ANTES de pedir los permisos: un dialogo del sistema que
 * aparece sin contexto se deniega por reflejo, y en Android denegar
 * dos veces bloquea el permiso hasta que el usuario lo cambie a mano
 * en los ajustes del telefono.
 */
const STEPS: Step[] = [
  {
    icon: 'camera',
    title: 'Sobre tu piel',
    body: 'La cámara muestra tu cuerpo en vivo y coloca el boceto encima, para que veas el tamaño y la posición reales antes de tatuarte. La imagen no sale de tu teléfono: solo se guarda si tocas "Guardar propuesta".',
  },
  {
    icon: 'image',
    title: 'Tu boceto',
    body: 'Este botón abre tus fotos para elegir el diseño que quieres probarte. Puede ser un boceto del tatuador, una referencia que guardaste o algo que hayas generado en "Diseña".',
  },
  {
    icon: 'move',
    title: 'Colocarlo',
    body: 'Arrastra el boceto con un dedo. Con dos dedos lo giras y cambias su tamaño a la vez, como con una foto. Si lo pierdes de vista, un doble toque lo devuelve al centro.',
  },
  {
    icon: 'cutout',
    title: 'Quitar el fondo',
    body: 'Un boceto fotografiado trae el papel y su sombra, y pegado sobre la piel se ve como un recorte rectangular. "Quitar el fondo" deja solo la tinta. Guarda las dos versiones, así que puedes volver a la original cuando quieras.',
  },
  {
    icon: 'body',
    title: 'Sobre un maniquí',
    body: 'Si prefieres no usar la cámara, el maniquí 3D hace lo mismo: gíralo con el dedo y coloca el boceto en cualquier zona del cuerpo.',
  },
];

export function CreateIntroModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={[typo.title, { color: colors.textStrong, flex: 1 }]}>Cómo funciona</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
              <Icon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.steps} showsVerticalScrollIndicator={false}>
            {STEPS.map((step) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepIcon}>
                  <Icon name={step.icon} size={22} color={colors.primaryText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>{step.title}</Text>
                  <Text style={[typo.body, { color: colors.textMuted, marginTop: 2 }]}>{step.body}</Text>
                </View>
              </View>
            ))}

            <Text style={[typo.caption, { color: colors.textMuted, marginTop: 4 }]}>
              Te pediremos permiso de cámara y de fotos cuando los necesites. Puedes decir que no y seguir usando el
              maniquí.
            </Text>
          </ScrollView>

          <AppButton label="Entendido" onPress={onClose} />
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
      maxHeight: '85%',
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center' },
    steps: { gap: 18, paddingBottom: 8 },
    step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    stepIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
