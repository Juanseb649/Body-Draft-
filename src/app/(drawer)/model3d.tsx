import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuButton } from '../../components/atoms/MenuButton';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { bodyModelService } from '../../core/services';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../models/bodyZone';
import { type as typo, useTheme } from '../../theme';

/** Pantalla "Explora" (maniquin 3D): la misma propuesta vista rotable. */
export default function BodyModelScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { bodyZone, silhouette } = useEditorStore((s) => s);
  const modelUrl = bodyModelService.modelAssetFor(silhouette);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BodyModelViewer modelUrl={modelUrl} alt={`Maniquí 3D - ${BODY_ZONE_LABELS[bodyZone]}`} />
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <MenuButton />
        <View style={styles.titleGroup}>
          <SectionIcon section="explora" size={30} />
          {/* El visor 3D siempre tiene fondo oscuro propio, asi que el
              titulo va blanco en ambos temas. */}
          <Text style={[typo.logoSection, { color: '#FFFFFF', fontSize: 32, lineHeight: 32 * 1.3, marginLeft: 6 }]}>
            Explora
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: { width: 44 },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
});
