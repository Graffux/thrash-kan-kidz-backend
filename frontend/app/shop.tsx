import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import BuyCoinsModal from '../src/components/BuyCoinsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpinResult {
  won_card: any;
  rarity: string;
  is_duplicate: boolean;
  remaining_coins: number;
  series_completion?: any;
}

interface SpinPoolData {
  current_series: number;
  series_name: string;
  series_description: string;
  series_cards: any[];
  owned_count: number;
  total_count: number;
  rare_reward: any;
  spin_cost: number;
}

export default function ShopScreen() {
  const { user, apiUrl, refreshData } = useApp();
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSeriesComplete, setShowSeriesComplete] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [spinPool, setSpinPool] = useState<SpinPoolData | null>(null);
  const [spinConfig, setSpinConfig] = useState({ spin_cost: 50 });
  const [packState, setPackState] = useState<'idle' | 'shaking' | 'opening' | 'revealed'>('idle');
  const [cardFlipped, setCardFlipped] = useState(false);
  
  // Animation values
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const packScaleAnim = useRef(new Animated.Value(1)).current;
  const packOpacityAnim = useRef(new Animated.Value(1)).current;
  const cardSlideAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.5)).current;
  const cardFlipAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';
  const CARD_BACK_IMAGE = 'https://customer-assets.emergentagent.com/job_d9b7563a-44d0-4dcc-ab9c-25c405b50d3f/artifacts/jlg546ha_file_00000000369c71f580be8b548f7c5be7.png';
  
  // Pack cover images per series
  const PACK_COVERS: { [key: number]: string } = {
    1: 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/qmfr196q_enhanced-1771247671181.jpg',
    2: 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/299mm98l_file_00000000e66c71fdbb3b59d1529ea8b0.png',
    3: 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/jo0a1vaf_file_00000000eb2c71f58adeb4fa7008890f.png',
    4: 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/rgut5wkf_file_00000000c08471f7b19a3eca347c7b62.png',
    5: 'https://customer-assets.emergentagent.com/job_1bc0dac8-eaf6-4ea9-b00d-e58826a0a195/artifacts/iulfre4h_file_00000000fd5c71f5b5ddd034a592fca7.png',
  };
  
  // Get current pack cover based on user's current series - recalculates when spinPool changes
  const packCoverImage = useMemo(() => {
    const series = spinPool?.current_series || 1;
    return PACK_COVERS[series] || PACK_COVERS[1];
  }, [spinPool?.current_series]);

  useEffect(() => {
    fetchSpinData();
  }, [user]);

  const fetchSpinData = async () => {
    if (!user) return;
    try {
      const [configRes, poolRes] = await Promise.all([
        fetch(`${apiUrl}/api/spin/config`),
        fetch(`${apiUrl}/api/users/${user.id}/spin-pool`)
      ]);
      const config = await configRes.json();
      const pool = await poolRes.json();
      setSpinConfig(config);
      setSpinPool(pool);
    } catch (error) {
      console.error('Error fetching spin data:', error);
    }
  };

  const resetAnimations = () => {
    shakeAnim.setValue(0);
    packScaleAnim.setValue(1);
    packOpacityAnim.setValue(1);
    cardSlideAnim.setValue(0);
    cardScaleAnim.setValue(0.5);
    cardFlipAnim.setValue(0);
    glowAnim.setValue(0);
    setPackState('idle');
    setCardFlipped(false);
  };

  const handleOpenPack = async () => {
    if (!user || spinning || !spinPool) return;
    
    if (user.coins < spinConfig.spin_cost) {
      setShowBuyCoins(true);
      return;
    }

    setSpinning(true);
    setSpinResult(null);
    resetAnimations();
    setPackState('shaking');

    try {
      // Phase 1: Pack shaking animation (1.5 seconds)
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ])
      );
      
      shakeAnimation.start();

      // Call API while shaking
      const response = await fetch(`${apiUrl}/api/users/${user.id}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      // Wait for shake animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      shakeAnimation.stop();
      shakeAnim.setValue(0);

      if (result.success) {
        setSpinResult(result);
        setPackState('opening');

        // Phase 2: Pack opens and card slides out (face down)
        Animated.parallel([
          // Pack scales up slightly then fades out
          Animated.sequence([
            Animated.timing(packScaleAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(packOpacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          // Card slides up from pack
          Animated.timing(cardSlideAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          // Card scales up
          Animated.timing(cardScaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setPackState('revealed');
          setSpinning(false);
          
          // Start glow animation for the reveal prompt
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(glowAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        });
      } else {
        setSpinning(false);
        resetAnimations();
        alert(result.detail || 'Failed to open pack');
      }
    } catch (error) {
      console.error('Pack opening error:', error);
      setSpinning(false);
      resetAnimations();
      alert('Failed to open pack. Please try again.');
    }
  };

  const handleRevealCard = () => {
    if (packState !== 'revealed' || cardFlipped) return;
    
    setCardFlipped(true);
    
    // Flip animation
    Animated.timing(cardFlipAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // After flip, show the result modal
      setTimeout(() => {
        setShowResult(true);
        refreshData();
        fetchSpinData();
      }, 800);
    });
  };

  const closeResult = () => {
    if (spinResult?.series_completion?.series_completed) {
      setShowResult(false);
      setShowSeriesComplete(true);
    } else {
      setShowResult(false);
      setSpinResult(null);
      resetAnimations();
    }
  };

  const closeSeriesComplete = () => {
    setShowSeriesComplete(false);
    setSpinResult(null);
    resetAnimations();
  };

  // Animation interpolations
  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-8, 0, 8],
  });

  const cardSlideTranslate = cardSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const cardFlipRotate = cardFlipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.overlay} />
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Please login to visit the shop</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = spinPool ? (spinPool.owned_count / spinPool.total_count) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.overlay} />

      {/* Buy Coins Modal */}
      <BuyCoinsModal visible={showBuyCoins} onClose={() => setShowBuyCoins(false)} />

      {/* Result Modal */}
      <Modal visible={showResult} transparent animationType="fade" onRequestClose={closeResult}>
        <View style={styles.resultOverlay}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>
              {spinResult?.is_duplicate ? '📦 Duplicate!' : '🎉 New Card!'}
            </Text>
            
            {spinResult && (
              <View style={styles.resultCardContainer}>
                <Image
                  source={{ uri: spinResult.won_card.front_image_url }}
                  style={styles.resultCardImage}
                  resizeMode="contain"
                />
              </View>
            )}
            
            <Text style={styles.resultCardName}>{spinResult?.won_card?.name}</Text>
            <Text style={styles.resultBand}>
              {spinResult?.won_card?.band} - Card {spinResult?.won_card?.card_type}
            </Text>
            
            {spinResult?.is_duplicate && (
              <View style={styles.duplicateBadge}>
                <Text style={styles.duplicateText}>Added for trading!</Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.closeResultButton} onPress={closeResult} data-testid="close-result-btn">
              <Text style={styles.closeResultText}>
                {spinResult?.series_completion?.series_completed ? 'Continue...' : 'Awesome!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Series Complete Modal */}
      <Modal visible={showSeriesComplete} transparent animationType="fade" onRequestClose={closeSeriesComplete}>
        <View style={styles.resultOverlay}>
          <View style={[styles.resultContainer, styles.seriesCompleteContainer]}>
            <Text style={styles.seriesCompleteTitle}>🏆 SERIES COMPLETE! 🏆</Text>
            <Text style={styles.seriesCompleteName}>
              {spinResult?.series_completion?.series_name}
            </Text>
            
            {spinResult?.series_completion?.rare_reward && (
              <>
                <Text style={styles.rareRewardTitle}>
                  {spinResult.series_completion.rare_reward.rarity === 'epic' ? 'Epic' : 'Rare'} Card Unlocked!
                </Text>
                <Image
                  source={{ uri: spinResult.series_completion.rare_reward.front_image_url }}
                  style={styles.rareRewardImage}
                  resizeMode="contain"
                />
                <Text style={styles.rareRewardName}>
                  {spinResult.series_completion.rare_reward.name}
                </Text>
              </>
            )}
            
            {spinResult?.series_completion?.next_series_unlocked && (
              <Text style={styles.nextSeriesText}>
                Series {spinResult.series_completion.next_series_unlocked} Unlocked!
              </Text>
            )}
            
            <TouchableOpacity style={styles.closeResultButton} onPress={closeSeriesComplete} data-testid="close-series-btn">
              <Text style={styles.closeResultText}>Amazing!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Card Pack</Text>
            <Text style={styles.subtitle}>{spinPool?.series_name || 'Loading...'}</Text>
          </View>
          <View style={styles.coinSection}>
            <View style={styles.coinDisplay}>
              <Text style={styles.coinIcon}>💰</Text>
              <Text style={styles.coinText}>{user.coins}</Text>
            </View>
            <TouchableOpacity 
              style={styles.buyCoinsButton}
              onPress={() => setShowBuyCoins(true)}
              data-testid="buy-coins-btn"
            >
              <Ionicons name="add-circle" size={16} color="#000" />
              <Text style={styles.buyCoinsText}>Buy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Series Progress */}
        {spinPool && (
          <View style={styles.seriesProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{spinPool.series_name}</Text>
              <Text style={styles.progressCount}>{spinPool.owned_count}/{spinPool.total_count}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            {spinPool.rare_reward && (
              <View style={styles.rewardPreview}>
                <Text style={styles.rewardLabel}>Complete to unlock:</Text>
                <Image 
                  source={{ uri: spinPool.rare_reward.front_image_url }}
                  style={styles.rewardThumb}
                  resizeMode="cover"
                />
                <Text style={styles.rewardName}>{spinPool.rare_reward.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Card Pack Section */}
        <View style={styles.packSection}>
          <View style={styles.packContainer}>
            {/* Card Pack Box - Now using the cover image */}
            {packState !== 'revealed' && (
              <Animated.View style={[
                styles.cardPack,
                {
                  transform: [
                    { translateX: shakeTranslate },
                    { scale: packScaleAnim },
                  ],
                  opacity: packOpacityAnim,
                }
              ]}>
                <Image 
                  source={{ uri: packCoverImage }}
                  style={styles.packImage}
                  resizeMode="cover"
                />
              </Animated.View>
            )}

            {/* Revealed Card (face down initially) */}
            {(packState === 'opening' || packState === 'revealed') && (
              <Animated.View style={[
                styles.revealedCard,
                {
                  transform: [
                    { translateY: cardSlideTranslate },
                    { scale: cardScaleAnim },
                    { rotateY: cardFlipRotate },
                  ],
                }
              ]}>
                <TouchableOpacity 
                  onPress={handleRevealCard}
                  disabled={cardFlipped}
                  activeOpacity={0.9}
                  style={styles.cardTouchable}
                  data-testid="reveal-card-btn"
                >
                  {/* Show pack cover on back, card front when flipped */}
                  <Image
                    source={{ uri: cardFlipped && spinResult ? spinResult.won_card.front_image_url : packCoverImage }}
                    style={styles.revealedCardImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Tap to Reveal Prompt */}
            {packState === 'revealed' && !cardFlipped && (
              <Animated.View style={[styles.tapPrompt, { opacity: glowOpacity }]}>
                <Text style={styles.tapPromptText}>TAP TO REVEAL!</Text>
              </Animated.View>
            )}
          </View>

          {/* Open Pack Button */}
          <TouchableOpacity
            style={[
              styles.openPackButton,
              (spinning || packState !== 'idle') && styles.openPackButtonDisabled,
              user.coins < spinConfig.spin_cost && styles.openPackButtonDisabled
            ]}
            onPress={handleOpenPack}
            disabled={spinning || packState !== 'idle' || user.coins < spinConfig.spin_cost}
            data-testid="open-pack-btn"
          >
            {spinning ? (
              <Text style={styles.openPackButtonText}>Opening...</Text>
            ) : packState !== 'idle' ? (
              <Text style={styles.openPackButtonText}>
                {cardFlipped ? 'Nice!' : 'Tap Card!'}
              </Text>
            ) : (
              <>
                <Text style={styles.openPackButtonText}>OPEN PACK!</Text>
                <Text style={styles.packCostText}>{spinConfig.spin_cost} 💰</Text>
              </>
            )}
          </TouchableOpacity>

          {user.coins < spinConfig.spin_cost && packState === 'idle' && (
            <Text style={styles.notEnoughCoins}>
              Not enough coins! Tap "Buy" to get more.
            </Text>
          )}
        </View>

        {/* Cards Grid - Show all series cards */}
        {spinPool && (
          <View style={styles.cardsSection}>
            <Text style={styles.cardsSectionTitle}>
              {spinPool.series_name} Cards ({spinPool.owned_count}/{spinPool.total_count})
            </Text>
            <View style={styles.cardsGrid}>
              {spinPool.series_cards.map((card) => (
                <View 
                  key={card.id} 
                  style={[
                    styles.cardItem,
                    card.owned && styles.cardItemOwned
                  ]}
                >
                  <Image
                    source={{ uri: card.front_image_url }}
                    style={[
                      styles.cardImage,
                      !card.owned && styles.cardImageLocked
                    ]}
                    resizeMode="cover"
                    blurRadius={card.owned ? 0 : 10}
                  />
                  {!card.owned && (
                    <View style={styles.cardLockOverlay}>
                      <Ionicons name="help" size={24} color="#FFD700" />
                    </View>
                  )}
                  <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                  <Text style={styles.cardBand}>{card.band}-{card.card_type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#888',
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  coinSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  coinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  buyCoinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
  },
  buyCoinsText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Series Progress
  seriesProgress: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  rewardLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 8,
  },
  rewardThumb: {
    width: 40,
    height: 50,
    borderRadius: 4,
    marginRight: 8,
  },
  rewardName: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  // Pack Section
  packSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  packContainer: {
    width: 200,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardPack: {
    width: 180,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  packImage: {
    width: '100%',
    height: '100%',
  },
  packBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFD700',
    overflow: 'hidden',
  },
  packTop: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    alignItems: 'center',
  },
  packLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
  packLabelSub: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1,
  },
  packMiddle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  packSeriesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
  packDecoration: {
    flexDirection: 'row',
    gap: 8,
  },
  packDecoEmoji: {
    fontSize: 28,
  },
  packBottom: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  packBottomText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600',
  },
  revealedCard: {
    position: 'absolute',
    width: 160,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  cardTouchable: {
    flex: 1,
  },
  revealedCardImage: {
    width: '100%',
    height: '100%',
  },
  tapPrompt: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tapPromptText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  openPackButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 180,
  },
  openPackButtonDisabled: {
    backgroundColor: '#555',
  },
  openPackButtonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  packCostText: {
    color: '#333',
    fontSize: 12,
    marginTop: 2,
  },
  notEnoughCoins: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  // Cards Section
  cardsSection: {
    marginTop: 8,
  },
  cardsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardItem: {
    width: '23%',
    marginBottom: 12,
    alignItems: 'center',
  },
  cardItemOwned: {
    opacity: 1,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
  },
  cardImageLocked: {
    borderColor: '#222',
  },
  cardLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
  },
  cardName: {
    color: '#fff',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  cardBand: {
    color: '#888',
    fontSize: 8,
  },
  // Result Modal
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  resultCardContainer: {
    marginBottom: 12,
  },
  resultCardImage: {
    width: 140,
    height: 180,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  resultCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  resultBand: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  duplicateBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  duplicateText: {
    color: '#FF9800',
    fontSize: 11,
    textAlign: 'center',
  },
  closeResultButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeResultText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Series Complete Modal
  seriesCompleteContainer: {
    borderColor: '#FFD700',
    backgroundColor: '#1a2a1a',
  },
  seriesCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  seriesCompleteName: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  rareRewardTitle: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rareRewardImage: {
    width: 120,
    height: 160,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#2196F3',
    marginBottom: 8,
  },
  rareRewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 12,
  },
  nextSeriesText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 12,
  },
});
