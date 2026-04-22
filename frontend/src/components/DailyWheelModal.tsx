import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WHEEL_IMAGE_FULL = 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/setdivo6_file_00000000ec5c722fb941eafbda99a3d2.png';
const WHEEL_IMAGE_INNER = 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/6z0zlu55_file_00000000ec5c722fb941eafbda99a3d2.png';

// Prizes in clockwise order starting from top (matching the wheel image)
// Image layout (clockwise from top): 200 coins, Free Pack, 25 coins, 1 medal, 50 coins, 3 medals, 100 coins, 5 medals
const PRIZES = [
  { type: 'coins', amount: 200, label: '200 Coins' },
  { type: 'free_pack', amount: 1, label: 'Free Pack!' },
  { type: 'coins', amount: 25, label: '25 Coins' },
  { type: 'medals', amount: 1, label: '1 Medal' },
  { type: 'coins', amount: 50, label: '50 Coins' },
  { type: 'medals', amount: 3, label: '3 Medals' },
  { type: 'coins', amount: 100, label: '100 Coins' },
  { type: 'medals', amount: 5, label: '5 Medals' },
];

const SLICE_ANGLE = 360 / PRIZES.length; // 45 degrees per slice

interface DailyWheelModalProps {
  visible: boolean;
  onClose: () => void;
  onSpin: () => Promise<any>;
  streak: number;
}

export const DailyWheelModal: React.FC<DailyWheelModalProps> = ({ visible, onClose, onSpin, streak }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    try {
      const data = await onSpin();
      const prize = data.prize;

      // Find the prize index on the wheel
      const prizeIndex = PRIZES.findIndex(
        p => p.type === prize.type && p.amount === prize.amount
      );
      const targetIndex = prizeIndex >= 0 ? prizeIndex : 0;

      // The pointer is at the top. We need to rotate the wheel so the target slice
      // ends up at the top. Each slice is 45 degrees.
      // Target angle to land on center of the prize slice
      const targetAngle = targetIndex * SLICE_ANGLE + SLICE_ANGLE / 2;
      // We want to spin backwards (clockwise visually) so subtract from 360
      const landingAngle = 360 - targetAngle;
      const totalRotation = 360 * 6 + landingAngle; // 6 full spins + landing

      spinAnim.setValue(0);
      currentRotation.current = landingAngle;

      Animated.timing(spinAnim, {
        toValue: totalRotation,
        duration: 5000,
        easing: Easing.bezier(0.15, 0.85, 0.2, 1),
        useNativeDriver: true,
      }).start(() => {
        setResult(data);
        setSpinning(false);
      });
    } catch (err: any) {
      setSpinning(false);
      setResult({ error: err.message || 'Failed to spin' });
    }
  };

  const handleClose = () => {
    spinAnim.setValue(0);
    currentRotation.current = 0;
    setResult(null);
    setSpinning(false);
    onClose();
  };

  const wheelRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 40, 340);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} data-testid="close-wheel-btn">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Daily Spin</Text>
          {streak > 0 && (
            <Text style={styles.streak}>
              {streak} day streak! {streak >= 7 ? 'BIG PRIZE guaranteed!' : `${7 - streak} more for bonus!`}
            </Text>
          )}

          {/* Wheel with layered images - static frame + spinning inner wheel */}
          <View style={[styles.wheelContainer, { width: WHEEL_SIZE, height: WHEEL_SIZE }]}>
            {/* Static frame (full wheel image) */}
            <ExpoImage
              source={{ uri: WHEEL_IMAGE_FULL }}
              style={[styles.wheelFrame, { width: WHEEL_SIZE, height: WHEEL_SIZE }]}
              contentFit="contain"
            />
            {/* Spinning inner wheel - clipped to circle, slightly smaller */}
            <View style={[styles.wheelInnerClip, { 
              width: WHEEL_SIZE * 0.78, 
              height: WHEEL_SIZE * 0.78, 
              borderRadius: (WHEEL_SIZE * 0.78) / 2 
            }]}>
              <Animated.View
                style={[
                  styles.wheelImageWrap,
                  { width: WHEEL_SIZE * 0.78, height: WHEEL_SIZE * 0.78 },
                  { transform: [{ rotate: wheelRotation }] },
                ]}
              >
                <ExpoImage
                  source={{ uri: WHEEL_IMAGE_INNER }}
                  style={{ width: WHEEL_SIZE * 0.78, height: WHEEL_SIZE * 0.78 }}
                  contentFit="contain"
                />
              </Animated.View>
            </View>
          </View>

          {/* Result */}
          {result && !result.error && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>You won!</Text>
              <Text style={styles.resultPrize}>{result.prize.label}</Text>
              {result.streak_bonus && <Text style={styles.streakBonus}>7-Day Streak Bonus!</Text>}
            </View>
          )}

          {result?.error && (
            <Text style={styles.errorText}>{result.error}</Text>
          )}

          {/* Spin / Collect Button */}
          {!result ? (
            <TouchableOpacity
              style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
              onPress={handleSpin}
              disabled={spinning}
              data-testid="spin-wheel-btn"
            >
              <Text style={styles.spinButtonText}>{spinning ? 'SPINNING...' : 'SPIN YOUR FATE!'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.collectButton} onPress={handleClose} data-testid="collect-prize-btn">
              <Text style={styles.collectButtonText}>REAP YOUR REWARDS!</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    maxWidth: 380,
    backgroundColor: '#0f0f1a',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  streak: {
    fontSize: 13,
    color: '#CE93D8',
    marginBottom: 8,
    textAlign: 'center',
  },
  wheelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  wheelFrame: {
    position: 'absolute',
  },
  wheelInnerClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelImageWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  resultTitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 4,
  },
  resultPrize: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  streakBonus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E91E63',
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginVertical: 8,
  },
  spinButton: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  spinButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  spinButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  collectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  collectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
});
