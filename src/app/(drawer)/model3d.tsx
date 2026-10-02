import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../../components/atoms/Chip';
import { MenuButton } from '../../components/atoms/MenuButton';
import { SectionIcon } from '../../components/atoms/SectionIcon';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { bodyModelService } from '../../core/services';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_SILHOUETTES, BODY_ZONE_LABELS, type BodySilhouette } from '../../models/bodyZone';
import { type as typo, useTheme } from '../../theme';

const SILHOUETTE_LABEL: Record<BodySilhouette, string> = {
  neutral: 'Neutro',
  masculine: 'Masculino',
  feminine: 'Femenino',
};

/** Pantalla "Explora" (maniquin 3D): la misma propuesta vista rotable. */
export default function BodyModelScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { bodyZone, silhouette, setSilhouette } = useEditorStore((s) => s);
  const modelUrl = bodyModelService.modelAssetFor(silhouette);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BodyModelViewer modelUrl={modelUrl} alt={`Maniquí 3D - ${BODY_ZONE_LABELS[bodyZone]}`} />

      {/* El visor 3D tiene fondo oscuro propio en ambos temas, por eso
          los controles van sobre una tarjeta oscura y no sobre surface. */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 20 }]}>
        {BODY_SILHOUETTES.map((s) => (
          <Chip
            key={s}
            label={SILHOUETTE_LABEL[s]}
            selected={silhouette === s}
            onPress={() => setSilhouette(s)}
            tone="fuchsia"
          />
        ))}
      </View>

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
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  spacer: { width: 44 },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
});
