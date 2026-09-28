import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionIcon } from '../../components/atoms/SectionIcon';
import { BodyModelViewer } from '../../components/organisms/BodyModelViewer';
import { bodyModelService } from '../../core/services';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../models/bodyZone';
import { type as typo, useTheme } from '../../theme';

/** Pantalla "Explora" (maniquin 3D): la misma propuesta vista rotable. */
export default function BodyModelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { bodyZone, silhouette } = useEditorStore((s) => s);
  const modelUrl = bodyModelService.modelAssetFor(silhouette);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BodyModelViewer modelUrl={modelUrl} alt={`Maniquí 3D - ${BODY_ZONE_LABELS[bodyZone]}`} />
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Text style={[typo.title, { color: '#FFFFFF' }]}>‹</Text>
        </Pressable>
        <View style={styles.titleGroup}>
          <SectionIcon section="explora" size={30} />
          <Text style={[typo.logoSection, { color: '#FFFFFF', fontSize: 32, lineHeight: 32 * 1.3, marginLeft: 6 }]}>
            Explora
          </Text>
        </View>
        <View style={[styles.iconButton, { opacity: 0 }]} />
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
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flexDirection: 'row', alignItems: 'center' },
});
