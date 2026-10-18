import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BODY_ZONE_LABELS, type BodyZone } from '../../models/bodyZone';
import { BODY_ZONE_GROUPS, groupOf, ZONE_HOTSPOTS, type BodyZoneGroup } from '../../models/bodyZoneGroups';
import type { Confidence } from '../../models/poseZone';
import { flatToneColor, fonts, type as typo, useTheme } from '../../theme';
import { Chip } from '../atoms/Chip';
import { Spinner } from '../atoms/Spinner';

/**
 * Lo que la deteccion de pose dice de la foto (ver poseZone.ts). Es una
 * SUGERENCIA: se marca en la figura y se confirma con un toque.
 */
export type ZoneHint =
  | { state: 'detecting' }
  | { state: 'suggested'; zone: BodyZone; confidence: Confidence }
  /** No se ve suficiente cuerpo (primer plano) o no se pudo detectar. */
  | { state: 'unknown'; reason: 'closeup' | 'unavailable' };

/** Figura de frente, caja 100×200: cabeza, torso, brazo y pierna de cada lado. */
const FIGURE =
  'M50 6 a11 12 0 1 1 -0.1 0 Z ' +
  'M44 29 h12 v6 l14 5 c6 2 8 8 9 14 l5 30 c1 8 3 18 3 24 l1 14 c0 4 -6 4 -6 0 l-3 -14 c-2 -8 -4 -16 -5 -24 l-3 -16 ' +
  'l-2 22 c0 8 2 14 3 20 l3 30 c1 10 1 22 0 32 l-1 16 c0 3 -7 3 -7 0 l-2 -16 c-2 -10 -3 -22 -3 -32 h-2 ' +
  'c0 10 -1 22 -3 32 l-2 16 c0 3 -7 3 -7 0 l-1 -16 c-1 -10 -1 -22 0 -32 l3 -30 c1 -6 3 -12 3 -20 l-2 -22 ' +
  'l-3 16 c-1 8 -3 16 -5 24 l-3 14 c0 4 -6 4 -6 0 l1 -14 c0 -6 2 -16 3 -24 l5 -30 c1 -6 3 -12 9 -14 l14 -5 Z';

const FIGURE_HEIGHT = 196;
const FIGURE_WIDTH = FIGURE_HEIGHT / 2;
/** Area tocable de cada punto, en pixeles: mas grande que el punto dibujado. */
const HIT = 30;

/**
 * Selector de la zona del cuerpo. Antes eran 12 chips en una fila que
 * habia que deslizar; ahora:
 *
 * - Arriba, la zona elegida en grande (o "Cuerpo entero"), para saber
 *   siempre donde se esta trabajando.
 * - A la izquierda, una figura con un punto por zona: se toca donde va
 *   el tatuaje, como se señalaria en el propio cuerpo.
 * - A la derecha, las zonas en tres grupos (Brazos, Torso, Piernas):
 *   pocas a la vez y con nombre, para quien prefiere leer.
 *
 * Los dos caminos eligen lo mismo y se sincronizan: tocar un punto
 * cambia tambien el grupo.
 */
export function BodyZonePicker({
  value,
  onChange,
  allowWholeBody = true,
  hint,
}: {
  value?: BodyZone;
  onChange: (zone: BodyZone | undefined) => void;
  /** "Cuerpo entero" deja el maniqui sin zona (verlo completo). */
  allowWholeBody?: boolean;
  /** Sugerencia de la foto (solo con foto tomada). */
  hint?: ZoneHint;
}) {
  const { colors, scheme } = useTheme();
  const [group, setGroup] = useState<BodyZoneGroup>(groupOf(value));
  const accent = flatToneColor(scheme, 'blue');
  const styles = createStyles(colors);

  const pick = (zone: BodyZone) => {
    setGroup(groupOf(zone));
    onChange(zone);
  };

  const current = BODY_ZONE_GROUPS.find((g) => g.key === group) ?? BODY_ZONE_GROUPS[0];
  const suggested = hint?.state === 'suggested' && hint.zone !== value ? hint.zone : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Zona del cuerpo</Text>
          <Text style={[styles.summaryValue, { color: value ? colors.textStrong : colors.textMuted }]}>
            {value ? BODY_ZONE_LABELS[value] : 'Cuerpo entero'}
          </Text>
        </View>
        {allowWholeBody && value && (
          <Pressable onPress={() => onChange(undefined)} hitSlop={8} accessibilityRole="button">
            <Text style={[typo.bodyStrong, { color: accent, fontSize: 14 }]}>Ver cuerpo entero</Text>
          </Pressable>
        )}
      </View>

      {hint && <HintBanner hint={hint} value={value} onUse={pick} />}

      <View style={styles.body}>
        <View style={{ width: FIGURE_WIDTH, height: FIGURE_HEIGHT }} accessibilityLabel="Figura del cuerpo: toca una zona">
          <Svg width={FIGURE_WIDTH} height={FIGURE_HEIGHT} viewBox="0 0 100 200">
            <Path d={FIGURE} fill={colors.border} />
            {(Object.keys(ZONE_HOTSPOTS) as BodyZone[]).map((zone) => {
              const { x, y } = ZONE_HOTSPOTS[zone];
              const active = zone === value;
              if (zone === suggested) {
                // La sugerencia: anillo discontinuo del color de marca,
                // para que se vea donde cree la foto que va el tatuaje.
                return (
                  <Circle key={zone} cx={x} cy={y} r={6.5} fill="none" stroke={accent} strokeWidth={1.8} strokeDasharray={[2.4, 1.8]} />
                );
              }
              return (
                <Circle
                  key={zone}
                  cx={x}
                  cy={y}
                  r={active ? 6 : 3.4}
                  fill={active ? accent : colors.background}
                  stroke={active ? accent : colors.textMuted}
                  strokeWidth={active ? 0 : 1.2}
                  // La espalda no se ve de frente: su punto va con trazo discontinuo.
                  strokeDasharray={zone === 'back' && !active ? [2, 1.6] : undefined}
                />
              );
            })}
          </Svg>
          {(Object.keys(ZONE_HOTSPOTS) as BodyZone[]).map((zone) => {
            const { x, y } = ZONE_HOTSPOTS[zone];
            const k = FIGURE_WIDTH / 100;
            return (
              <Pressable
                key={zone}
                onPress={() => pick(zone)}
                style={[styles.hit, { left: x * k - HIT / 2, top: y * k - HIT / 2 }]}
                accessibilityRole="button"
                accessibilityLabel={BODY_ZONE_LABELS[zone]}
                accessibilityState={{ selected: zone === value }}
              />
            );
          })}
        </View>

        <View style={styles.side}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {BODY_ZONE_GROUPS.map((g) => {
              const active = g.key === group;
              return (
                <Pressable
                  key={g.key}
                  onPress={() => setGroup(g.key)}
                  style={[styles.tab, active && { backgroundColor: colors.secondaryTint }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabLabel, { color: active ? accent : colors.textMuted }]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.chips}>
            {current.zones.map((zone) => (
              <Chip key={zone} label={BODY_ZONE_LABELS[zone]} selected={zone === value} onPress={() => pick(zone)} tone="blue" />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function HintBanner({ hint, value, onUse }: { hint: ZoneHint; value?: BodyZone; onUse: (zone: BodyZone) => void }) {
  const { colors, scheme } = useTheme();
  const accent = flatToneColor(scheme, 'blue');
  const styles = createStyles(colors);

  if (hint.state === 'detecting') {
    return (
      <View style={styles.hint} accessibilityLiveRegion="polite">
        <Spinner size={16} color={colors.textMuted} />
        <Text style={styles.hintText}>Buscando en tu foto qué zona es…</Text>
      </View>
    );
  }
  if (hint.state === 'unknown') {
    return (
      <View style={styles.hint} accessibilityLiveRegion="polite">
        <Text style={styles.hintText}>
          {hint.reason === 'closeup'
            ? 'En la foto no se ve suficiente del cuerpo para saber la zona: elígela tú.'
            : 'No se pudo reconocer la zona en esta foto: elígela tú.'}
        </Text>
      </View>
    );
  }
  if (hint.zone === value) {
    return (
      <View style={styles.hint}>
        <Text style={styles.hintText}>Coincide con lo que se ve en tu foto.</Text>
      </View>
    );
  }
  return (
    <View style={[styles.hint, { backgroundColor: colors.secondaryTint }]} accessibilityLiveRegion="polite">
      <Text style={[styles.hintText, { color: colors.text }]}>
        {hint.confidence === 'alta' ? 'En tu foto parece ' : 'Puede que sea '}
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.textStrong }}>{BODY_ZONE_LABELS[hint.zone].toLowerCase()}</Text>
      </Text>
      <Pressable
        onPress={() => onUse(hint.zone)}
        hitSlop={8}
        style={({ pressed }) => [styles.useButton, { borderColor: accent }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`Usar ${BODY_ZONE_LABELS[hint.zone]}`}
      >
        <Text style={[typo.bodyStrong, { color: accent, fontSize: 14 }]}>Usar</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    hint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },
    hintText: { ...typo.body, fontSize: 14, lineHeight: 20, color: colors.textMuted, flex: 1 },
    useButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center' },
    container: { gap: 14, padding: 16, borderRadius: 22, backgroundColor: colors.surfaceSunken },
    summary: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    summaryLabel: { ...typo.caption, color: colors.textMuted },
    summaryValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
    body: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    hit: { position: 'absolute', width: HIT, height: HIT, borderRadius: HIT / 2 },
    side: { flex: 1, gap: 12 },
    tabs: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 14, backgroundColor: colors.surface },
    tab: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
