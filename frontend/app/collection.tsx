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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface Card {
  id: string;
  name: string;
  description: string;
  rarity: string;
  front_image_url: string;
  coin_cost: number;
}

interface UserCard {
  user_card_id: string;
  card: Card;
  quantity: number;
  acquired_at: string;
}

export default function CollectionScreen() {
  const { user, userCards, allCards, loading } = useApp();
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [filter, setFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const flipAnimation = useSharedValue(0);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color="#666" />
          <Text style={styles.lockedText}>Please login to view your collection</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ownedCardIds = new Set(userCards.map(uc => uc.card.id));
  
  const getFilteredCards = () => {
    switch (filter) {
      case 'owned':
        return userCards;
      case 'missing':
        return allCards
          .filter(card => !ownedCardIds.has(card.id))
          .map(card => ({
            user_card_id: `missing_${card.id}`,
            card,
            quantity: 0,
            acquired_at: '',
          }));
      default:
        // Show all cards, with owned ones first
        const owned = userCards;
        const missing = allCards
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

  const flipCard = () => {
    flipAnimation.value = withTiming(flipAnimation.value === 0 ? 1 : 0, { duration: 500 });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return '#808080';
      case 'rare':
        return '#4169E1';
      case 'epic':
        return '#9932CC';
      default:
        return '#808080';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Collection</Text>
        <Text style={styles.subtitle}>
          {userCards.length} / {allCards.length} Cards
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
            <TouchableOpacity
              key={uc.user_card_id}
              style={[
                styles.cardContainer,
                uc.quantity === 0 && styles.cardLocked,
              ]}
              onPress={() => {
                if (uc.quantity > 0) {
                  setSelectedCard(uc);
                  flipAnimation.value = 0;
                }
              }}
              disabled={uc.quantity === 0}
            >
              <Image
                source={{ uri: uc.card.front_image_url }}
                style={[
                  styles.cardImage,
                  uc.quantity === 0 && styles.cardImageLocked,
                ]}
                resizeMode="cover"
              />
              {uc.quantity === 0 && (
                <View style={styles.lockedOverlay}>
                  <Ionicons name="lock-closed" size={32} color="#fff" />
                </View>
              )}
              <View
                style={[styles.rarityBadge, { backgroundColor: getRarityColor(uc.card.rarity) }]}
              >
                <Text style={styles.rarityText}>{uc.card.rarity.toUpperCase()}</Text>
              </View>
              {uc.quantity > 1 && (
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>x{uc.quantity}</Text>
                </View>
              )}
            </TouchableOpacity>
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
              <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
                <View style={styles.cardDetailContainer}>
                  <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
                    <Image
                      source={{ uri: selectedCard.card.front_image_url }}
                      style={styles.cardDetailImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                  <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
                    <View style={styles.cardBackContent}>
                      <Text style={styles.cardName}>{selectedCard.card.name}</Text>
                      <View
                        style={[
                          styles.detailRarityBadge,
                          { backgroundColor: getRarityColor(selectedCard.card.rarity) },
                        ]}
                      >
                        <Text style={styles.detailRarityText}>
                          {selectedCard.card.rarity.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.cardDescription}>
                        {selectedCard.card.description}
                      </Text>
                      <View style={styles.cardStats}>
                        <Text style={styles.statLabel}>Owned:</Text>
                        <Text style={styles.statValue}>x{selectedCard.quantity}</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.tapHint}>Tap card to flip</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedText: {
    color: '#666',
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
    color: '#888',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
  },
  filterTabActive: {
    backgroundColor: '#FFD700',
  },
  filterText: {
    color: '#888',
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
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 24,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageLocked: {
    opacity: 0.3,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  rarityBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  cardBack: {
    backgroundColor: '#1a1a2e',
  },
  cardDetailImage: {
    width: '100%',
    height: '100%',
  },
  cardBackContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailRarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRarityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
