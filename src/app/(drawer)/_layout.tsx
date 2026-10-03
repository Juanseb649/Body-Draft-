import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { View } from 'react-native';

import { SidebarContent } from '../../components/organisms/SidebarContent';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useTheme } from '../../theme';

/**
 * Area autenticada. La navegacion principal es un menu lateral
 * (guia de diseno, "Flujo de navegación y rutas": `src/app/(drawer)/`),
 * con las pantallas de drill-down (perfil de artista, agendar cita)
 * apiladas encima desde el Stack raiz. Si no hay sesion, redirige a
 * Bienvenida.
 */
export default function DrawerLayout() {
  const { colors } = useTheme();
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!session) return <Redirect href="/welcome" />;

  return (
    <Drawer
      drawerContent={(props) => <SidebarContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.surface, width: 300 },
        sceneStyle: { backgroundColor: colors.background },
        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Inicio' }} />
      <Drawer.Screen name="disena" options={{ title: 'Diseña' }} />
      {/* Camara y maniquin 3D conviven en Crea, y el gesto de arrastre
          choca con sus propios controles: ahi el menu solo se abre con
          el boton. */}
      <Drawer.Screen name="editor" options={{ title: 'Crea', swipeEnabled: false }} />
      <Drawer.Screen name="artists" options={{ title: 'Artistas' }} />
      <Drawer.Screen name="agenda" options={{ title: 'Agenda' }} />
      <Drawer.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Drawer>
  );
}
