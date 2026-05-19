/**
 * GrungeBackground — shared full-screen wrapper that lays down the
 * Thrash Kan Kidz visual identity (dark base + slime-green vignette
 * + rust corners + noise overlay) behind any screen content.
 *
 * Built with absolutely-positioned <View>s + LinearGradient so it works
 * everywhere (web preview, Android, iOS) without bundling raster images
 * for every layer. Children render on top via flex.
 *
 * Usage:
 *   <GrungeBackground>
 *     <ScrollView>...</ScrollView>
 *   </GrungeBackground>
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Slightly lighter base for screens that need more contrast (e.g. forms). */
  lighten?: boolean;
}

export const GrungeBackground: React.FC<Props> = ({ children, style, lighten }) => {
  return (
    <View style={[styles.root, lighten && styles.rootLight, style]} testID="grunge-bg">
      {/* Dark base layer — solid color reads cleaner than a gradient on dark UI. */}
      <View style={styles.base} pointerEvents="none" />

      {/* Slime-green radial-ish vignette via a soft top-center gradient. We
          fake a radial by stacking two linear gradients (top & bottom) since
          react-native-linear-gradient doesn't ship a true radial. */}
      <LinearGradient
        colors={['rgba(57, 255, 20, 0.10)', 'rgba(57, 255, 20, 0.00)', 'rgba(0, 0, 0, 0.0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Rust corner glows — top-left + bottom-right warm tint */}
      <LinearGradient
        colors={['rgba(140, 60, 18, 0.35)', 'rgba(140, 60, 18, 0.0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.55, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(120, 30, 10, 0.30)']}
        start={{ x: 0.45, y: 0.45 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Edge vignette — darken corners so content pops in the middle */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Noise overlay — tiled dots simulate grain without a raster asset.
          The grid is intentionally sparse so it never overwhelms the UI;
          on smaller phones the dots get clipped at edges which is fine. */}
      <View style={styles.noise} pointerEvents="none">
        {Array.from({ length: 80 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.noiseDot,
              {
                top: `${(i * 37) % 100}%`,
                left: `${(i * 71) % 100}%`,
                opacity: 0.04 + ((i * 13) % 9) / 100,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070a07',
  },
  rootLight: {
    backgroundColor: '#0d1410',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0d0a',
  },
  noise: {
    ...StyleSheet.absoluteFillObject,
  },
  noiseDot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#a8ffae',
  },
  content: {
    flex: 1,
  },
});

export default GrungeBackground;
