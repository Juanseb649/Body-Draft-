import { View } from 'react-native';

import { BodyModelViewer } from '../../../components/organisms/BodyModelViewer';
import { bodyModelService } from '../../../core/services';
import { useEditorStore } from '../../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../../models/bodyZone';
import { useTheme } from '../../../theme';

/**
 * Pantalla "Maniquin 3D": la misma propuesta (useEditorStore) vista
 * como una maqueta 3D rotable, en lugar de sobre la camara en vivo.
 *
 * No genera un modelo por propuesta: carga el .glb generico de la
 * silueta elegida y (a futuro) superpone el diseno como textura en la
 * region de malla correspondiente a bodyZone (ver bodyModelService.ts
 * y ARCHITECTURE.md).
 */
export default function BodyModelScreen() {
  const { colors } = useTheme();
  const { bodyZone, silhouette } = useEditorStore((s) => s);
  const modelUrl = bodyModelService.modelAssetFor(silhouette);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BodyModelViewer modelUrl={modelUrl} alt={`Maniquin 3D - ${BODY_ZONE_LABELS[bodyZone]}`} />
    </View>
  );
}
