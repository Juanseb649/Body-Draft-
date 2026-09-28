import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { NeonSwoosh } from '../atoms/NeonSwoosh';
import { NeonText } from '../atoms/NeonText';
import { fonts } from '../../theme';

export function BodyDraftLogo({
  size = 112,
  variant = 'stacked',
  style,
}: {
  size?: number;
  variant?: 'stacked' | 'inline';
  style?: StyleProp<ViewStyle>;
}) {
  const s = size / 112;
  const text = { fontFamily: fonts.logo, fontSize: size, lineHeight: size * 1.02, paddingHorizontal: size * 0.12, includeFontPadding: false };

  if (variant === 'inline') {
    return (
      <View style={[styles.inline, style]} accessible accessibilityRole="header" accessibilityLabel="Body Draft">
        <NeonText tone="fuchsia" style={text}>Body</NeonText>
        <NeonText tone="blue" style={text} containerStyle={{ marginLeft: -size * 0.2 }}>Draft</NeonText>
      </View>
    );
  }

  return (
    <View style={[styles.stacked, style]} accessible accessibilityRole="header" accessibilityLabel="Body Draft">
      <NeonText tone="fuchsia" style={text} containerStyle={{ marginRight: 90 * s }}>
        Body
      </NeonText>
      <NeonText tone="blue" style={text} containerStyle={{ marginLeft: 110 * s, marginTop: -26 * s }}>
        Draft
      </NeonText>
      <NeonSwoosh width={250 * s} tone="blue" style={{ marginTop: -30 * s, marginLeft: 140 * s }} />
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
});
