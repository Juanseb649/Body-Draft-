import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/atoms/AppButton';
import { Chip } from '../../components/atoms/Chip';
import { artistRepository } from '../../core/services';
import { useAppointmentStore } from '../../controllers/useAppointmentStore';
import { useAuthStore } from '../../controllers/useAuthStore';
import { useEditorStore } from '../../controllers/useEditorStore';
import { BODY_ZONE_LABELS } from '../../models/bodyZone';
import { type as typo, useTheme } from '../../theme';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const TIME_SLOTS = ['10:00', '11:30', '14:00', '16:30'];

/** Genera la cuadricula del mes (semanas L-D), con `null` en huecos. */
function monthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [...Array(mondayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Pantalla "Agenda" (agendar cita): calendario + horarios para el tatuador elegido. */
export default function AppointmentScreen() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const proposal = useEditorStore((s) => s);
  const userId = useAuthStore((s) => s.user?.id) ?? proposal.userId;
  const { book, isLoading, error } = useAppointmentStore();

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [day, setDay] = useState<number | null>(today.getDate());
  const [time, setTime] = useState<string | null>(null);
  const [artistName, setArtistName] = useState('tu artista');

  const styles = createStyles(colors);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  useEffect(() => {
    artistRepository.getArtistById(artistId).then((a) => a && setArtistName(a.name));
  }, [artistId]);

  const changeMonth = (delta: number) => {
    setDay(null);
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleConfirm = async () => {
    if (!day || !time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(cursor.year, cursor.month, day, hours, minutes);
    const ok = await book({ userId, artistId, dateTime: dateTime.toISOString(), proposalId: proposal.id });
    if (ok) router.replace('/agenda');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Text style={[typo.title, { color: colors.textStrong }]}>‹</Text>
        </Pressable>
        <Text style={[typo.logoSection, { color: colors.textStrong, fontSize: 32, lineHeight: 36 }]}>Agenda</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.proposalCard}>
        <View style={[styles.proposalIcon, { backgroundColor: colors.primaryTint }]}>
          <Text style={{ color: colors.primary }}>♡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typo.bodyStrong, { color: colors.textStrong }]}>Tu propuesta</Text>
          <Text style={[typo.caption, { color: colors.textMuted }]}>
            {BODY_ZONE_LABELS[proposal.bodyZone]} · {Math.round(proposal.placement.scale * 100)} % · con {artistName}
          </Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={8}>
            <Text style={[typo.title, { color: colors.textStrong }]}>‹</Text>
          </Pressable>
          <Text style={[typo.sectionTitle, { color: colors.textStrong }]}>
            {MONTH_NAMES[cursor.month]} {cursor.year}
          </Text>
          <Pressable onPress={() => changeMonth(1)} hitSlop={8}>
            <Text style={[typo.title, { color: colors.textStrong }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[typo.caption, styles.weekday, { color: colors.textMuted }]}>
              {w}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((d, di) => (
              <Pressable
                key={di}
                disabled={d == null}
                onPress={() => setDay(d)}
                style={[styles.dayCell, d === day && { backgroundColor: colors.primary, borderRadius: 20 }]}
              >
                {d != null && (
                  <Text style={[typo.body, { color: d === day ? colors.onPrimary : colors.text }]}>{d}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Text style={[typo.label, { color: colors.textMuted, marginTop: 20 }]}>Horarios disponibles</Text>
      <View style={styles.chipRow}>
        {TIME_SLOTS.map((slot) => (
          <Chip key={slot} label={slot} selected={time === slot} onPress={() => setTime(slot)} tone="blue" />
        ))}
      </View>

      <View style={{ flex: 1 }} />
      {error && <Text style={[typo.caption, { color: colors.danger, marginBottom: 8 }]}>{error}</Text>}
      <AppButton label="Confirmar cita" onPress={handleConfirm} disabled={!day || !time} isLoading={isLoading} />
      <View style={{ height: insets.bottom + 16 }} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    proposalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    proposalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    calendarCard: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekday: { width: 36, textAlign: 'center' },
    dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  });
}
