import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppointmentStore } from '../../../controllers/useAppointmentStore';
import { useAuthStore } from '../../../controllers/useAuthStore';
import { fonts, type as typo, useTheme } from '../../../theme';

/** Pantalla "Mis citas": proximas, anteriores y su estado. */
export default function MyAppointmentsScreen() {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.user?.id);
  const { appointments, loadAppointments, cancel } = useAppointmentStore();

  useEffect(() => {
    if (userId) loadAppointments(userId);
  }, [userId, loadAppointments]);

  const styles = createStyles(colors);

  return (
    <FlatList
      data={appointments}
      keyExtractor={(a) => a.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text style={styles.date}>{new Date(item.dateTime).toLocaleString()}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
          {item.status === 'pending' && (
            <Pressable onPress={() => cancel(item)} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.cancel}>Cancelar</Text>
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
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    date: { ...typo.bodyStrong, color: colors.textStrong },
    status: { ...typo.caption, color: colors.secondary, marginTop: 2 },
    cancel: { fontFamily: fonts.bodySemiBold, color: colors.danger },
  });
}
