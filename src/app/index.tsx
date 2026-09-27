import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/atoms/AppButton';

/**
 * Pantalla de inicio: disenos recientes, propuestas guardadas, proxima
 * cita y acceso rapido a crear diseno.
 */
export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppButton label="Crear diseno" onPress={() => router.push('/design/create')} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Propuestas guardadas</Text>
        {/* TODO: listar TattooProposal del usuario (useDesignStore). */}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proxima cita</Text>
        {/* TODO: mostrar proximo Appointment (useAppointmentStore). */}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => router.push('/artists')}>
          <Text style={styles.navLink}>Tatuadores</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/appointment/mine')}>
          <Text style={styles.navLink}>Mis citas</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  nav: { flexDirection: 'row', gap: 24, marginTop: 8 },
  navLink: { color: '#6750A4', fontWeight: '600', fontSize: 15 },
});
