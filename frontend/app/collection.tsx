import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
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
}

interface UserCard {
  user_card_id: string;
  card: Card;
  quantity: number;
  acquired_at: string;
}

// Flippable Card Component
const FlippableCard = ({ 
  userCard, 
  isOwned, 
  onPress 
}: { 
  userCard: UserCard; 
  isOwned: boolean; 
  onPress: () => void;
}) => {
  const flipProgress = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Check if card can be flipped (only owned cards that are available)
  const canFlip = isOwned && userCard.card.available !== false;

  const flipCard = () => {
    if (!canFlip) return; // Don't flip if not allowed
    const newValue = isFlipped ? 0 : 1;
    flipProgress.value = withTiming(newValue, { duration: 400 });
    setIsFlipped(!isFlipped);
  };

  // Swipe gesture for flipping - only enabled for owned, available cards
  const swipeGesture = Gesture.Pan()
    .enabled(canFlip)
    .onEnd((event) => {
      if (canFlip && (Math.abs(event.velocityX) > 200 || Math.abs(event.translationX) > 50)) {
        runOnJS(flipCard)();
      }
    });

  // Tap gesture for modal
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (isOwned) {
        runOnJS(onPress)();
      }
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
      <View style={[styles.cardContainer, !isOwned && styles.cardLocked]}>
        {/* Front of card */}
        <Animated.View style={frontAnimatedStyle}>
          {isOwned ? (
            // Show actual card image for owned cards
            <Image
              source={{ uri: userCard.card.front_image_url }}
              style={[
                styles.cardImage, 
                userCard.card.available === false && styles.cardImageComingSoon
              ]}
              resizeMode="cover"
              blurRadius={userCard.card.available === false ? 10 : 0}
            />
          ) : (
            // Show mystery card for unowned cards - hide image
            <View style={styles.mysteryCard}>
              <View style={styles.mysteryCardInner}>
                <Text style={styles.mysteryIcon}>❓</Text>
                <Text style={styles.mysteryText}>???</Text>
              </View>
            </View>
          )}
          {userCard.card.available === false && (
            <View style={styles.comingSoonOverlay}>
              <Text style={styles.comingSoonIcon}>⏰</Text>
              <Text style={styles.comingSoonText}>COMING</Text>
              <Text style={styles.comingSoonText}>SOON</Text>
            </View>
          )}
          {userCard.quantity > 1 && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>x{userCard.quantity}</Text>
            </View>
          )}
        </Animated.View>

        {/* Back of card */}
        <Animated.View style={[backAnimatedStyle]}>
          <View style={styles.cardBackContainer}>
            {isOwned ? (
              <Image
                source={{ uri: userCard.card.back_image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mysteryCard}>
                <View style={styles.mysteryCardInner}>
                  <Text style={styles.mysteryIcon}>❓</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Card name badge - only show for owned cards */}
        <View style={styles.cardNameBadge}>
          <Text style={styles.cardNameText} numberOfLines={1}>
            {isOwned ? userCard.card.name : '???'}
          </Text>
        </View>

        {/* Swipe hint - only show for owned, available cards */}
        {canFlip && (
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>↔</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

export default function CollectionScreen() {
  const { user, userCards, allCards } = useApp();
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const modalFlipProgress = useSharedValue(0);

  const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';

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

  const ownedCardIds = new Set(userCards.map(uc => uc.card.id));
  
  // Filter out rare cards from the main collection (they have their own section in shop)
  const commonCards = allCards.filter(card => card.rarity !== 'rare');
  
  const getFilteredCards = () => {
    switch (filter) {
      case 'owned':
        return userCards;
      case 'missing':
        return commonCards
          .filter(card => !ownedCardIds.has(card.id))
          .map(card => ({
            user_card_id: `missing_${card.id}`,
            card,
            quantity: 0,
            acquired_at: '',
          }));
      default:
        const owned = userCards;
        const missing = commonCards
          .filter(card => !ownedCardIds.has(card.id))
          .map(card => ({
            user_card_id: `missing_${card.id}`,
            card,
            quantity: 0,
            acquired_at: '',
          }));
        return [...owned, ...missing];
    }
  };

  const filteredCards = getFilteredCards();

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
            {userCards.length} / {allCards.length} Cards • Swipe to flip!
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'owned', 'missing'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.cardsGrid}>
            {filteredCards.map((uc) => (
              <FlippableCard
                key={uc.user_card_id}
                userCard={uc}
                isOwned={uc.quantity > 0}
                onPress={() => {
                  setSelectedCard(uc);
                  modalFlipProgress.value = 0;
                }}
              />
            ))}
          </View>
        </ScrollView>

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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#FFD700',
  },
  filterText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
    paddingBottom: 24,
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
  cardLocked: {
    opacity: 0.7,
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
  cardImageLocked: {
    opacity: 0.4,
  },
  cardImageComingSoon: {
    opacity: 0.5,
  },
  mysteryCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  mysteryCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    margin: 4,
    borderRadius: 8,
  },
  mysteryIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  mysteryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  lockedIcon: {
    fontSize: 24,
  },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
  },
  comingSoonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  comingSoonText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
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
});
