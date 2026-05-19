/**
 * RippableDailyPack — drag-to-tear envelope for the Daily Bonus.
 *
 * Uses the same SVG mask scratch technique as ScratchCard but renders its
 * own art (no external images) so it ships zero new assets:
 *   - Bottom layer: glowing slime-green "CLAIM!" panel revealed underneath.
 *   - Top layer: rusted-paper pack wrapper with "RIP TO CLAIM" prompt.
 *   - User drags finger across the cover → mask cuts holes → wrapper tears
 *     off → onComplete() fires once threshold (~50%) is crossed.
 *
 * State transitions:
 *   - "fresh"     → torn 0%, prompt visible
 *   - "ripped"    → torn ≥ threshold, prompt fades, onComplete() called
 *   - "claimed"   → external prop, shows "ALREADY CLAIMED" placard
 *
 * Why not reuse <ScratchCard>: ScratchCard requires `imageUri` + `coverUri`
 * raster URLs. We want a zero-asset solution that looks deliberately like a
 * paper pack tear, not a foil scratch — different visual language despite
 * identical mechanics under the hood.
 */
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Defs, Mask, Rect, Circle, G, LinearGradient as SvgGrad, Stop, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface Props {
  width?: number;
  height?: number;
  claimed?: boolean;
  loading?: boolean;
  onClaim: () => void;       // Fires once the user finishes ripping
  brushRadius?: number;
  threshold?: number;
}

export const RippableDailyPack: React.FC<Props> = ({
  width = 320,
  height = 130,
  claimed = false,
  loading = false,
  onClaim,
  brushRadius = 24,
  threshold = 0.45,
}) => {
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  const [ripped, setRipped] = useState(false);
  const coverOpacity = useRef(new Animated.Value(1)).current;
  const cellSize = Math.max(8, Math.floor(brushRadius / 1.5));
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const totalCells = cols * rows;
  const touched = useRef<Set<number>>(new Set());
  const lastHapticAt = useRef(0);

  const fireHaptic = useCallback(() => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastHapticAt.current < 70) return;
    lastHapticAt.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const triggerRip = useCallback(() => {
    if (ripped) return;
    setRipped(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    Animated.timing(coverOpacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      onClaim();
    });
  }, [ripped, coverOpacity, onClaim]);

  const recordTouch = useCallback(
    (x: number, y: number) => {
      if (claimed || ripped) return;
      const cx = Math.max(0, Math.min(width, x));
      const cy = Math.max(0, Math.min(height, y));
      const col = Math.floor(cx / cellSize);
      const row = Math.floor(cy / cellSize);
      const key = row * cols + col;
      if (!touched.current.has(key)) {
        touched.current.add(key);
        fireHaptic();
      }
      setDots((prev) => [...prev, { x: cx, y: cy }]);
      const coverage = touched.current.size / totalCells;
      if (coverage >= threshold) triggerRip();
    },
    [width, height, cellSize, cols, totalCells, threshold, triggerRip, fireHaptic, claimed, ripped]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !claimed && !ripped,
        onMoveShouldSetPanResponder: () => !claimed && !ripped,
        onPanResponderGrant: (e: GestureResponderEvent) =>
          recordTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e: GestureResponderEvent) =>
          recordTouch(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    [recordTouch, claimed, ripped]
  );

  // Reset on claimed → false (e.g. next day)
  useEffect(() => {
    if (!claimed) {
      setDots([]);
      setRipped(false);
      touched.current = new Set();
      coverOpacity.setValue(1);
    }
  }, [claimed, coverOpacity]);

  // Already claimed state — show locked placard, no gesture handlers.
  if (claimed) {
    return (
      <View style={[styles.wrap, { width, height }]} testID="daily-pack-claimed">
        <View style={[styles.claimedBg, { width, height }]}>
          <Text style={styles.claimedSkull}>💀</Text>
          <Text style={styles.claimedText}>BONUS CLAIMED</Text>
          <Text style={styles.claimedSub}>Come back tomorrow, thrasher</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, { width, height }]}
      {...panResponder.panHandlers}
      testID="daily-pack-rippable"
    >
      {/* Bottom layer: slime-green "CLAIM!" panel revealed under the wrapper. */}
      <View style={[styles.bottomLayer, { width, height }]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgGrad id="claimGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#39ff14" stopOpacity="1" />
              <Stop offset="1" stopColor="#0a8a02" stopOpacity="1" />
            </SvgGrad>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#claimGrad)" rx="14" />
        </Svg>
        <View style={styles.bottomContent}>
          {loading ? (
            <ActivityIndicator color="#000" size="large" />
          ) : (
            <>
              <Text style={styles.bottomEmoji}>🎁</Text>
              <Text style={styles.bottomTitle}>CLAIM!</Text>
            </>
          )}
        </View>
      </View>

      {/* Top layer: rusted-paper pack wrapper with SVG-mask rip mechanics. */}
      <Animated.View
        pointerEvents={ripped ? 'none' : 'auto'}
        style={[styles.coverLayer, { opacity: coverOpacity, width, height }]}
      >
        <Svg width={width} height={height}>
          <Defs>
            <SvgGrad id="paperGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#5a3220" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#7a3f1a" stopOpacity="1" />
              <Stop offset="1" stopColor="#3a2010" stopOpacity="1" />
            </SvgGrad>
            <Mask id="ripMask" x="0" y="0" width={width} height={height}>
              <Rect x="0" y="0" width={width} height={height} fill="white" rx="14" />
              <G>
                {dots.map((d, i) => (
                  <Circle key={i} cx={d.x} cy={d.y} r={brushRadius} fill="black" />
                ))}
              </G>
            </Mask>
          </Defs>
          {/* Whole pack painted, masked by user's drag */}
          <G mask="url(#ripMask)">
            <Rect x="0" y="0" width={width} height={height} fill="url(#paperGrad)" rx="14" />
            {/* Decorative tear-line stitches across the middle */}
            <Path
              d={`M 12 ${height / 2 - 6} Q ${width / 4} ${height / 2 + 4} ${width / 2} ${height / 2 - 6} T ${width - 12} ${height / 2 - 4}`}
              stroke="#1a0e08"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              fill="none"
            />
            <Path
              d={`M 12 ${height / 2 + 6} Q ${width / 4} ${height / 2 + 16} ${width / 2} ${height / 2 + 6} T ${width - 12} ${height / 2 + 8}`}
              stroke="#1a0e08"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              fill="none"
            />
          </G>
        </Svg>
        {/* Text label sits on top in a separate View so it inherits the
            cover's opacity but isn't masked (we want the prompt readable
            until enough of the cover is torn). */}
        <View pointerEvents="none" style={styles.promptOverlay}>
          <Text style={styles.promptTitle}>DAILY BONUS</Text>
          <Text style={styles.promptSub}>👉 RIP TO CLAIM 👈</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#0a0a0a',
  },
  bottomLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomEmoji: {
    fontSize: 36,
  },
  bottomTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginTop: 2,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  coverLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    color: '#ffd24a',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  promptSub: {
    color: '#fff8e0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Claimed state
  claimedBg: {
    backgroundColor: '#1a1f1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a3a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedSkull: {
    fontSize: 30,
    opacity: 0.5,
  },
  claimedText: {
    color: '#5a8a5a',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  claimedSub: {
    color: '#446',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default RippableDailyPack;
