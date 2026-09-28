import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { NeonSwoosh } from '../atoms/NeonSwoosh';
import { NeonText } from '../atoms/NeonText';
import { SectionIcon } from '../atoms/SectionIcon';
import { SECTIONS, type SectionKey } from '../atoms/sectionIcons';
import { fonts } from '../../theme';

export type { SectionKey };

export function SectionLogo({
  section,
  variant = 'hero',
  style,
}: {
  section: SectionKey;
  variant?: 'hero' | 'compact';
  style?: StyleProp<ViewStyle>;
}) {
  const { label, word, swoosh } = SECTIONS[section];
  const compact = variant === 'compact';
  const fontSize = compact ? 56 : 112;
  const iconSize = compact ? 72 : 190;

  // Misma tecnica que BodyDraftLogo: la palabra vive en una caja de altura
  // fija (basada en el line-height viejo) para que un lineHeight mas
  // generoso (evita recortar los bucles del cursivo) no desplace el swoosh.
  const wordBoxHeight = fontSize * 1.05;

  return (
    <View style={[compact ? styles.row : styles.column, style]} accessible accessibilityRole="header" accessibilityLabel={label}>
      <SectionIcon section={section} size={iconSize} />
      <View style={compact ? styles.wordCompact : styles.word}>
        <View style={{ height: wordBoxHeight, justifyContent: 'center' }}>
          <NeonText
            tone={word}
            style={[styles.text, { fontSize, lineHeight: fontSize * 1.3, paddingHorizontal: fontSize * 0.12 }]}
          >
            {label}
          </NeonText>
        </View>
        <NeonSwoosh
          width={fontSize * 1.9}
          tone={swoosh}
          style={{ marginTop: -fontSize * 0.28, marginLeft: fontSize * 0.4 }}
        />
      </View>
    </View>
  );
}

export function SectionTitle({ section }: { section: SectionKey }) {
  const { label, word } = SECTIONS[section];
  return (
    <NeonText tone={word} accessibilityRole="header" style={styles.header}>
      {label}
    </NeonText>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  word: { alignItems: 'center', marginTop: -16 },
  wordCompact: { alignItems: 'flex-start' },
  text: { fontFamily: fonts.logo },
  header: { fontFamily: fonts.logo, fontSize: 32, lineHeight: 32 * 1.3, paddingHorizontal: 6 },
});
