import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 3; // 3 cards per row for smaller size
const CARD_HEIGHT = CARD_WIDTH * 1.5; // Full card aspect ratio

interface Card {
  id: string;
  name: string;
  description: string;
  rarity: string;
  front_image_url: string;
  back_image_url: string;
  coin_cost: number;
  series?: number;
  band?: string;
  card_type?: string;
  base_card_id?: string;
  variant_name?: string;
}

interface UserCard {
  user_card_id: string;
  card: Card;
  quantity: number;
  acquired_at: string;
}

// Flippable Card Component - Only shows owned cards now
const FlippableCard = ({ 
  userCard, 
  onPress 
}: { 
  userCard: UserCard; 
  onPress: () => void;
}) => {
  const flipProgress = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Check if this is a variant card
  const isVariant = !!userCard.card.base_card_id;

  const flipCard = () => {
    const newValue = isFlipped ? 0 : 1;
    flipProgress.value = withTiming(newValue, { duration: 400 });
    setIsFlipped(!isFlipped);
  };

  // Swipe gesture for flipping
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.velocityX) > 200 || Math.abs(event.translationX) > 50) {
        runOnJS(flipCard)();
      }
    });

  // Tap gesture for modal
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const composedGesture = Gesture.Race(swipeGesture, tapGesture);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
      position: 'absolute',
      width: '100%',
      height: '100%',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
      position: 'absolute',
      width: '100%',
      height: '100%',
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.cardContainer, isVariant && styles.variantCardBorder]}>
        {/* Front of card */}
        <Animated.View style={frontAnimatedStyle}>
          <Image
            source={{ uri: userCard.card.front_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          {userCard.quantity > 1 && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>x{userCard.quantity}</Text>
            </View>
          )}
          {isVariant && (
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>VAR</Text>
            </View>
          )}
        </Animated.View>

        {/* Back of card */}
        <Animated.View style={[backAnimatedStyle]}>
          <View style={styles.cardBackContainer}>
            <Image
              source={{ uri: userCard.card.back_image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        {/* Card name badge */}
        <View style={styles.cardNameBadge}>
          <Text style={styles.cardNameText} numberOfLines={1}>
            {userCard.card.name}
          </Text>
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>↔</Text>
        </View>
      </View>
    </GestureDetector>
  );
};

export default function CollectionScreen() {
  const { user, userCards, allCards, apiUrl, refreshData } = useApp();
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [tradeInEligible, setTradeInEligible] = useState<any[]>([]);
  const [showTradeInResult, setShowTradeInResult] = useState(false);
  const [tradeInResult, setTradeInResult] = useState<any>(null);
  const [isTrading, setIsTrading] = useState(false);
  const modalFlipProgress = useSharedValue(0);

  const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';

  // Fetch trade-in eligible cards
  useEffect(() => {
    if (user) {
      fetchTradeInEligible();
    }
  }, [user, userCards]);

  const fetchTradeInEligible = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/trade-in-eligible`);
      const data = await response.json();
      setTradeInEligible(data.eligible_cards || []);
    } catch (error) {
      console.error('Error fetching trade-in eligible cards:', error);
    }
  };

  const handleTradeIn = async (cardId: string) => {
    if (!user || isTrading) return;
    
    setIsTrading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/trade-in/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setTradeInResult(data);
        setShowTradeInResult(true);
        refreshData();
        fetchTradeInEligible();
      } else {
        Alert.alert('Trade-In Failed', data.detail || 'Could not complete trade-in');
      }
    } catch (error) {
      console.error('Trade-in error:', error);
      Alert.alert('Error', 'Failed to complete trade-in');
    } finally {
      setIsTrading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.backgroundOverlay} />
        <View style={styles.centerContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>Please login to view your collection</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group owned cards by type for display
  const ownedBaseCards = userCards.filter(uc => !uc.card.base_card_id); // Base cards (no parent)
  const ownedVariants = userCards.filter(uc => uc.card.base_card_id); // Variant cards (have parent)
  const ownedRewards = userCards.filter(uc => uc.card.rarity === 'rare' || uc.card.rarity === 'epic');
  
  // Count owned common base cards per series for progress display
  const ownedSeries1Commons = ownedBaseCards.filter(uc => uc.card.series === 1 && uc.card.rarity === 'common').length;
  const ownedSeries2Commons = ownedBaseCards.filter(uc => uc.card.series === 2 && uc.card.rarity === 'common').length;
  const ownedSeries3Commons = ownedBaseCards.filter(uc => uc.card.series === 3 && uc.card.rarity === 'common').length;
  
  // Total owned cards (base + variants + rewards)
  const totalOwned = userCards.length;
  
  // Simply return ALL owned cards - no mystery/coming soon placeholders
  const filteredCards = userCards;

  const flipModalCard = () => {
    modalFlipProgress.value = withTiming(modalFlipProgress.value === 0 ? 1 : 0, { duration: 500 });
  };

  const modalFrontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(modalFlipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const modalBackStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(modalFlipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.backgroundOverlay} />
        <View style={styles.header}>
          <Text style={styles.title}>My Collection</Text>
          <Text style={styles.subtitle}>
            {totalOwned} Cards Collected • Swipe to flip!
          </Text>
          {/* Series Progress */}
          <View style={styles.seriesProgress}>
            <Text style={styles.seriesProgressText}>S1: {ownedSeries1Commons}/16</Text>
            <Text style={styles.seriesProgressText}>S2: {ownedSeries2Commons}/16</Text>
            <Text style={styles.seriesProgressText}>S3: {ownedSeries3Commons}/16</Text>
            {ownedVariants.length > 0 && (
              <Text style={styles.variantProgressText}>+{ownedVariants.length} Variants</Text>
            )}
          </View>
        </View>

        {/* Trade-In Header Section */}
        {tradeInEligible.length > 0 && (
          <View style={styles.tradeInSection}>
            <Text style={styles.tradeInTitle}>🔄 Trade-In for Variants</Text>
            <Text style={styles.tradeInSubtitle}>Trade 5 duplicates for a rare variant!</Text>
            {tradeInEligible.map((item) => (
              <View key={item.card.id} style={styles.tradeInCard}>
                <Image 
                  source={{ uri: item.card.front_image_url }}
                  style={styles.tradeInImage}
                  resizeMode="cover"
                />
                <View style={styles.tradeInInfo}>
                  <Text style={styles.tradeInName}>{item.card.name}</Text>
                  <Text style={styles.tradeInQuantity}>
                    {item.quantity} duplicates • {item.variants_owned}/{item.variants_total} variants
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.tradeInButton, isTrading && styles.tradeInButtonDisabled]}
                  onPress={() => handleTradeIn(item.card.id)}
                  disabled={isTrading}
                  data-testid={`trade-in-${item.card.id}`}
                >
                  <Text style={styles.tradeInButtonText}>
                    {isTrading ? '...' : 'TRADE IN'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {filteredCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🃏</Text>
            <Text style={styles.emptyStateTitle}>No Cards Yet!</Text>
            <Text style={styles.emptyStateSubtitle}>
              Head to the Shop to open some card packs and start your collection!
            </Text>
          </View>
        ) : (
          <View style={styles.flashListContainer}>
            <FlashList
              data={filteredCards}
              renderItem={({ item: uc }) => (
                <FlippableCard
                  key={uc.user_card_id}
                  userCard={uc}
                  onPress={() => {
                    setSelectedCard(uc);
                    modalFlipProgress.value = 0;
                  }}
                />
              )}
              keyExtractor={(item) => item.user_card_id}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flashListContent}
            />
          </View>
        )}

        {/* Trade-In Result Modal */}
        <Modal
          visible={showTradeInResult}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTradeInResult(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.tradeInResultContainer}>
              <Text style={styles.tradeInResultTitle}>🎉 NEW VARIANT!</Text>
              {tradeInResult && (
                <>
                  <Image
                    source={{ uri: tradeInResult.won_variant.front_image_url }}
                    style={styles.tradeInResultImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.tradeInResultName}>{tradeInResult.won_variant.name}</Text>
                  <Text style={styles.tradeInResultDesc}>
                    {tradeInResult.variants_owned}/{tradeInResult.variants_total} variants collected
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.tradeInResultButton}
                onPress={() => setShowTradeInResult(false)}
                data-testid="close-trade-in-result"
              >
                <Text style={styles.tradeInResultButtonText}>Awesome!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Card Detail Modal */}
        <Modal
          visible={selectedCard !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedCard(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCard(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              {selectedCard && (
                <TouchableOpacity onPress={flipModalCard} activeOpacity={0.9}>
                  <View style={styles.cardDetailContainer}>
                    <Animated.View style={[styles.cardFace, modalFrontStyle]}>
                      <Image
                        source={{ uri: selectedCard.card.front_image_url }}
                        style={styles.cardDetailImage}
                        resizeMode="cover"
                      />
                    </Animated.View>
                    <Animated.View style={[styles.cardFace, modalBackStyle]}>
                      <Image
                        source={{ uri: selectedCard.card.back_image_url }}
                        style={styles.cardDetailImage}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.tapHint}>Tap card to flip</Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockedText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  seriesProgress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  seriesProgressText: {
    fontSize: 12,
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  variantProgressText: {
    fontSize: 12,
    color: '#9b59b6',
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  flashListContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  flashListContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    marginBottom: 12,
    marginHorizontal: 4,
  },
  variantCardBorder: {
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  variantBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#9b59b6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variantBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  cardBackContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 24,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 3,
    borderRadius: 8,
  },
  swipeHintText: {
    color: '#888',
    fontSize: 10,
  },
  cardNameBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  cardNameText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardBack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFD700',
    overflow: 'hidden',
  },
  cardBackInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    margin: 8,
    borderRadius: 8,
    padding: 10,
  },
  cardBackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardBackIcon: {
    marginVertical: 8,
  },
  cardBackName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  cardBackBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: '#FF4500',
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 16,
    zIndex: 10,
  },
  cardDetailContainer: {
    width: width * 0.7,
    height: width * 0.7 * 1.4,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBackModal: {
    backgroundColor: '#1a1a2e',
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  cardDetailImage: {
    width: '100%',
    height: '100%',
  },
  cardBackContentModal: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    margin: 10,
    borderRadius: 12,
  },
  modalCardBackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalCardBackIcon: {
    marginBottom: 16,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDescription: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tapHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
  // Trade-In Styles
  tradeInSection: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  tradeInTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9b59b6',
    marginBottom: 4,
  },
  tradeInSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  tradeInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  tradeInImage: {
    width: 50,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
  },
  tradeInInfo: {
    flex: 1,
  },
  tradeInName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  tradeInQuantity: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  tradeInButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tradeInButtonDisabled: {
    backgroundColor: '#555',
  },
  tradeInButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tradeInResultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 320,
    borderWidth: 3,
    borderColor: '#9b59b6',
  },
  tradeInResultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9b59b6',
    marginBottom: 16,
  },
  tradeInResultImage: {
    width: 180,
    height: 240,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#9b59b6',
    marginBottom: 12,
  },
  tradeInResultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  tradeInResultDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  tradeInResultButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  tradeInResultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
