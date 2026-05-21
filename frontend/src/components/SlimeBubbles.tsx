/**
 * SlimeBubbles — looping animated slime-green particles for the background.
 *
 * Pure RN Animated (no Reanimated) so it works in any context. 8 bubbles
 * float upward at staggered speeds + pulse opacity. Sits behind app content
 * inside GrungeBackground via z-index.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Dimensions } from 'react-native';

const NUM = 14;
const { height: H } = Dimensions.get('window');

interface Bubble {
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
}

const BUBBLES: Bubble[] = Array.from({ length: NUM }).map((_, i) => ({
  x: ((i * 73) % 95) + 2,         // %
  size: 8 + (i % 5) * 4,          // 8–24 px (was 4–10)
  duration: 9000 + (i * 1700) % 9000, // 9–18 s
  delay: i * 500,
  opacityRange: [0.15, 0.55 + (i % 3) * 0.1],
}));

export const SlimeBubbles: React.FC = () => {
  const anims = useRef(BUBBLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((v, i) => {
      const b = BUBBLES[i];
      return Animated.loop(
        Animated.sequence([
          Animated.delay(b.delay),
          Animated.timing(v, {
            toValue: 1,
            duration: b.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BUBBLES.map((b, i) => {
        const v = anims[i];
        const translateY = v.interpolate({
          inputRange: [0, 1],
          outputRange: [H + b.size, -b.size - 20],
        });
        const opacity = v.interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, b.opacityRange[1], b.opacityRange[1], 0],
        });
        const scale = v.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.7, 1, 0.85],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.bubble,
              {
                left: `${b.x}%`,
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#39ff14',
    shadowColor: '#39ff14',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default SlimeBubbles;
