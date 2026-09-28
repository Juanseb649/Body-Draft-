import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../../components/atoms/AppButton';
import { useAppointmentStore } from '../../../controllers/useAppointmentStore';
import { useEditorStore } from '../../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../../models/bodyZone';
import { palette, type as typo, useTheme } from '../../../theme';

/**
 * Pantalla "Agendar cita": elige fecha/hora para el tatuador
 * seleccionado, usando la propuesta guardada en useEditorStore.
 */
export default function AppointmentScreen() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const { colors } = useTheme();
  const proposal = useEditorStore((s) => s);
  const book = useAppointmentStore((s) => s.book);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showPicker, setShowPicker] = useState(false);

  const styles = createStyles(colors);

  const handleConfirm = async () => {
    if (!date) return;
    await book({
      userId: proposal.userId,
      artistId,
      dateTime: date.toISOString(),
      proposalId: proposal.id,
    });
    router.replace('/dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.label}>Diseño</Text>
        <Text style={styles.value}>{proposal.designId}</Text>
        <Text style={styles.label}>Zona</Text>
        <Text style={styles.value}>{BODY_ZONE_LABELS[proposal.bodyZone]}</Text>
      </View>

      <AppButton
        label={date ? date.toLocaleString() : 'Elegir fecha y hora'}
        variant="secondary"
        onPress={() => setShowPicker(true)}
      />

      {showPicker && (
        <DateTimePicker
          value={date ?? new Date()}
          mode="datetime"
          minimumDate={new Date()}
          themeVariant="dark"
          accentColor={palette.fuchsia}
          onChange={(_event, selected) => {
            setShowPicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      <View style={styles.spacer} />
      <AppButton label="Confirmar cita" onPress={handleConfirm} disabled={!date} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: colors.background },
    summary: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    label: { ...typo.caption, color: colors.textMuted },
    value: { ...typo.bodyStrong, color: colors.textStrong, marginBottom: 8 },
    spacer: { flex: 1 },
  });
}
