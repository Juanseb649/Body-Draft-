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
  // lineHeight 1.3x: la fuente cursiva Sacramento tiene bucles altos que un
  // line-height cercano al fontSize recorta (se veia como un logo mal cortado).
  const text = { fontFamily: fonts.logo, fontSize: size, lineHeight: size * 1.3, paddingHorizontal: size * 0.12 };

  if (variant === 'inline') {
    return (
      <View style={[styles.inline, style]} accessible accessibilityRole="header" accessibilityLabel="Body Draft">
        <NeonText tone="fuchsia" style={text}>Body</NeonText>
        <NeonText tone="blue" style={text} containerStyle={{ marginLeft: -size * 0.2 }}>Draft</NeonText>
      </View>
    );
  }

  // El diseno "stacked" superpone "Body"/"Draft" con margenes negativos
  // calculados sobre la altura ORIGINAL y ajustada de linea (~size). Si el
  // NeonText de adentro creciera con el lineHeight generoso de `text`,
  // esos margenes quedarian mal (todo el logo se desarma). Por eso cada
  // palabra vive en una caja de altura fija (`wordBox`, igual a la altura
  // vieja), centrada, y el texto puede desbordarla sin recortarse ni mover
  // a su hermano.
  const wordBoxHeight = size * 1.02;

  return (
    <View style={[styles.stacked, style]} accessible accessibilityRole="header" accessibilityLabel="Body Draft">
      <View style={{ height: wordBoxHeight, justifyContent: 'center', marginRight: 90 * s }}>
        <NeonText tone="fuchsia" style={text}>
          Body
        </NeonText>
      </View>
      <View style={{ height: wordBoxHeight, justifyContent: 'center', marginLeft: 110 * s, marginTop: -26 * s }}>
        <NeonText tone="blue" style={text}>
          Draft
        </NeonText>
      </View>
      <NeonSwoosh width={250 * s} tone="blue" style={{ marginTop: -30 * s, marginLeft: 140 * s }} />
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center' },
});
