import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionHeader } from '../../components/molecules/SectionHeader';
import { useAppointmentStore } from '../../controllers/useAppointmentStore';
import { useAuthStore } from '../../controllers/useAuthStore';
import { type as typo, useTheme } from '../../theme';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

/** Pestana "Agenda": tus citas, proximas y anteriores. */
export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const { appointments, loadAppointments, cancel, error } = useAppointmentStore();

  const styles = createStyles(colors);

  useEffect(() => {
    if (userId) loadAppointments(userId);
  }, [userId, loadAppointments]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
      data={appointments}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <SectionHeader section="agenda" />
          {error && <Text style={[typo.caption, { color: colors.danger, marginTop: 8 }]}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        <Text style={[typo.body, { color: colors.textMuted, marginHorizontal: 20 }]}>
          Todavía no tienes citas agendadas.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>{new Date(item.dateTime).toLocaleString()}</Text>
            <Text style={[typo.caption, { color: colors.secondary }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          </View>
          {item.status === 'pending' && (
            <Pressable onPress={() => cancel(item)} accessibilityRole="button" hitSlop={12}>
              <Text style={[typo.bodyStrong, { color: colors.danger }]}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 6,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
