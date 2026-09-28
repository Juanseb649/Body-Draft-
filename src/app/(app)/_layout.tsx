import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';

import { DrawerContent } from '../../components/organisms/DrawerContent';
import { useAuthStore } from '../../controllers/useAuthStore';
import { fonts, useTheme } from '../../theme';

/**
 * Area autenticada: Drawer (sidebar) que envuelve el dashboard y el
 * resto de las secciones. `drawerType: 'back'` deja el sidebar detras
 * del contenido y el contenido se desliza para revelarlo al arrastrar
 * desde el borde izquierdo — el efecto "estilo Twitter/X" pedido.
 */
export default function AppLayout() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  if (!session) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        drawerType: 'back',
        overlayColor: 'rgba(0,0,0,0.35)',
        drawerStyle: { width: '78%', backgroundColor: colors.surface },
        headerStyle: { backgroundColor: colors.header },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold },
      }}
    >
      <Drawer.Screen name="dashboard" options={{ drawerLabel: 'Dashboard', title: 'Dashboard' }} />
      <Drawer.Screen name="design/create" options={{ drawerLabel: 'Diseña', title: 'Diseña' }} />
      <Drawer.Screen name="editor/index" options={{ drawerLabel: 'Editor', title: 'Editor' }} />
      <Drawer.Screen name="model3d/index" options={{ drawerLabel: 'Maniquí 3D', title: 'Maniquí 3D' }} />
      <Drawer.Screen name="artists/index" options={{ drawerLabel: 'Tatuadores', title: 'Tatuadores' }} />
      <Drawer.Screen name="appointment/mine" options={{ drawerLabel: 'Mis citas', title: 'Mis citas' }} />
      <Drawer.Screen name="appointment/[artistId]" options={{ drawerItemStyle: { display: 'none' }, title: 'Agendar cita' }} />
    </Drawer>
  );
}
