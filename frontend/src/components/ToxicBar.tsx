/**
 * ToxicBar — slime-tube progress bar.
 *
 * Replaces plain green rectangles. Uses a gradient fill + a few bubble
 * dots floating inside. The whole thing reads as "ooze flowing through
 * a tube" instead of "progress bar."
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../theme';

interface Props {
  /** 0–100 */
  percent: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  tone?: 'slime' | 'gold' | 'purple';
}

const TONE_COLORS: Record<NonNullable<Props['tone']>, [string, string, string]> = {
  slime: ['#5aff5a', THEME.slime, THEME.slimeDeep],
  gold: ['#fff36a', THEME.gold, '#a88010'],
  purple: [THEME.anarchyGlow, THEME.anarchy, THEME.anarchyDeep],
};

export const ToxicBar: React.FC<Props> = ({ percent, height = 10, style, tone = 'slime' }) => {
  const pct = Math.max(0, Math.min(100, percent));
  const colors = TONE_COLORS[tone];

  return (
    <View style={[styles.tube, { height }, style]}>
      {/* Tube inner shadow effect via two stacked colors */}
      <View style={[styles.tubeInner, { height }]} />
      {/* Fill */}
      <View style={[styles.fillWrap, { width: `${pct}%` }]}>
        <LinearGradient
          colors={[colors[0], colors[1], colors[2]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
        />
        {/* Bubbles — small light dots scattered in the fill */}
        {pct > 12 && (
          <>
            <View style={[styles.bubble, { top: height / 4 - 1, left: '20%' }]} />
            <View style={[styles.bubble, { top: height / 2 - 1, left: '55%', width: 2, height: 2 }]} />
            <View style={[styles.bubble, { top: height / 4, left: '78%' }]} />
          </>
        )}
        {/* Highlight stripe across the top */}
        <View style={[styles.highlight, { height: Math.max(1, height / 5) }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tube: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  tubeInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  fillWrap: {
    height: '100%',
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
  },
});

export default ToxicBar;
