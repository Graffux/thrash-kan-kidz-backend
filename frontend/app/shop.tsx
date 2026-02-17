import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface RareCardStatus {
  card: any;
  owned: boolean;
  required_cards: number;
  progress: number;
  can_unlock: boolean;
}

export default function ShopScreen() {
  const { user, allCards, userCards, purchaseCard, apiUrl } = useApp();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [rareCardsStatus, setRareCardsStatus] = useState<RareCardStatus[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [unlockedCard, setUnlockedCard] = useState<any>(null);
  const [celebrationType, setCelebrationType] = useState<'rare' | 'milestone'>('rare');
  const [milestoneInfo, setMilestoneInfo] = useState<any>(null);
  const [loadingRare, setLoadingRare] = useState(false);

  const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';

  // Fetch rare card status when user changes or after purchase
  const fetchRareCardStatus = async () => {
    if (!user) return;
    
    try {
      setLoadingRare(true);
      const response = await fetch(`${apiUrl}/api/users/${user.id}/check-rare-cards`);
      const data = await response.json();
      
      setRareCardsStatus(data.rare_cards || []);
      setTotalCards(data.total_cards || 0);
      setMilestoneInfo(data.milestone_info || null);
      
      // Check if any card was newly unlocked
      if (data.newly_unlocked) {
        setUnlockedCard(data.newly_unlocked);
        setCelebrationType('rare');
        setShowCelebration(true);
      }
    } catch (error) {
      console.error('Error fetching rare card status:', error);
    } finally {
      setLoadingRare(false);
    }
  };

  useEffect(() => {
    fetchRareCardStatus();
  }, [user, userCards]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.backgroundOverlay} />
        <View style={styles.centerContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>Please login to visit the shop</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePurchase = async (cardId: string, cost: number, cardName: string, available: boolean) => {
    if (!available) {
      Alert.alert('Coming Soon!', `${cardName} is not yet available. Check back later!`);
      return;
    }

    if (user.coins < cost) {
      Alert.alert('Not Enough Coins', `You need ${cost} coins to purchase ${cardName}. Keep completing goals to earn more!`);
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Buy ${cardName} for ${cost} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            setPurchasing(cardId);
            try {
              const result = await purchaseCard(cardId);
              
              // Check if a milestone bonus was awarded
              if (result?.milestone_reward) {
                setUnlockedCard(result.milestone_reward.card);
                setCelebrationType('milestone');
                setShowCelebration(true);
              }
              // Check if a rare card was unlocked with this purchase
              else if (result?.newly_unlocked_rare_card) {
                setUnlockedCard(result.newly_unlocked_rare_card);
                setCelebrationType('rare');
                setShowCelebration(true);
              } else {
                Alert.alert('Success!', `You got ${cardName}!`);
              }
              
              // Refresh rare card status
              await fetchRareCardStatus();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to purchase card');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const getOwnedQuantity = (cardId: string) => {
    const uc = userCards.find(uc => uc.card.id === cardId);
    return uc?.quantity || 0;
  };

  // Separate available, unavailable, and rare cards
  const availableCards = allCards.filter(card => card.available !== false && card.rarity !== 'rare');
  const unavailableCards = allCards.filter(card => card.available === false && card.rarity !== 'rare');

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.backgroundOverlay} />
      
      {/* Celebration Modal for Card Unlock */}
      <Modal
        visible={showCelebration}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCelebration(false)}
      >
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationModal}>
            <Text style={styles.celebrationEmoji}>
              {celebrationType === 'rare' ? '🎉✨🏆✨🎉' : '🎁✨🃏✨🎁'}
            </Text>
            <Text style={styles.celebrationTitle}>
              {celebrationType === 'rare' ? 'RARE CARD UNLOCKED!' : 'MILESTONE BONUS!'}
            </Text>
            {unlockedCard && (
              <>
                <Image
                  source={{ uri: unlockedCard.front_image_url }}
                  style={styles.celebrationCardImage}
                  resizeMode="contain"
                />
                <Text style={styles.celebrationCardName}>{unlockedCard.name}</Text>
                <Text style={styles.celebrationDescription}>
                  {celebrationType === 'rare' 
                    ? "You've earned this legendary card by collecting cards!"
                    : "Free card for reaching a 5-card milestone!"}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.celebrationButton}
              onPress={() => {
                setShowCelebration(false);
                setUnlockedCard(null);
              }}
            >
              <Text style={styles.celebrationButtonText}>AWESOME!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Card Shop</Text>
          <Text style={styles.subtitle}>Buy cards with your coins</Text>
        </View>
        <View style={styles.coinDisplay}>
          <Text style={styles.coinIcon}>💰</Text>
          <Text style={styles.coinText}>{user.coins}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Milestone Progress Section */}
        {milestoneInfo && (
          <View style={styles.milestoneBanner}>
            <Text style={styles.milestoneTitle}>🎁 Milestone Bonus 🎁</Text>
            <Text style={styles.milestoneSubtitle}>
              Get a FREE card every 5 cards collected!
            </Text>
            <View style={styles.milestoneProgressContainer}>
              <View style={styles.milestoneProgressBar}>
                <View 
                  style={[
                    styles.milestoneProgressFill,
                    { width: `${(milestoneInfo.progress_to_next / 5) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.milestoneProgressText}>
                {milestoneInfo.progress_to_next}/5 to next free card
              </Text>
            </View>
          </View>
        )}

        {/* Rare Cards Section */}
        <View style={styles.rareSectionHeader}>
          <Text style={styles.rareSectionTitle}>⭐ Rare Achievement Cards ⭐</Text>
          <Text style={styles.rareSectionSubtitle}>Collect cards to unlock these special rewards!</Text>
          <Text style={styles.progressText}>Your Collection: {totalCards} cards</Text>
        </View>
        
        <View style={styles.rareCardsGrid}>
          {rareCardsStatus.map((rareStatus) => (
            <View 
              key={rareStatus.card.id} 
              style={[
                styles.rareCard,
                rareStatus.owned && styles.rareCardOwned
              ]}
            >
              {rareStatus.owned ? (
                // Show the card if owned
                <Image
                  source={{ uri: rareStatus.card.front_image_url }}
                  style={styles.rareCardImage}
                  resizeMode="cover"
                />
              ) : (
                // Show blurred/locked version if not owned
                <View style={styles.rareBlurContainer}>
                  <Image
                    source={{ uri: rareStatus.card.front_image_url }}
                    style={[styles.rareCardImage, styles.blurredImage]}
                    resizeMode="cover"
                    blurRadius={20}
                  />
                  <View style={styles.rareLockedOverlay}>
                    <Text style={styles.rareLockedIcon}>🔒</Text>
                    <Text style={styles.rareRequirement}>
                      Collect {rareStatus.required_cards} cards
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar,
                          { width: `${(rareStatus.progress / rareStatus.required_cards) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressNumbers}>
                      {rareStatus.progress}/{rareStatus.required_cards}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.rareCardInfo}>
                <Text style={styles.rareCardName}>{rareStatus.card.name}</Text>
                {rareStatus.owned && (
                  <Text style={styles.rareOwnedBadge}>✅ UNLOCKED</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Available Cards */}
        <Text style={styles.sectionTitle}>Thrash Kan Kidz Cards</Text>
        <View style={styles.cardsGrid}>
          {availableCards.map(card => (
            <View key={card.id} style={styles.shopCard}>
              <Image
                source={{ uri: card.front_image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.name}</Text>
                {getOwnedQuantity(card.id) > 0 && (
                  <Text style={styles.ownedText}>Owned: x{getOwnedQuantity(card.id)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.buyButton,
                  user.coins < card.coin_cost && styles.buyButtonDisabled,
                ]}
                onPress={() => handlePurchase(card.id, card.coin_cost, card.name, true)}
                disabled={purchasing === card.id || user.coins < card.coin_cost}
              >
                {purchasing === card.id ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[
                    styles.buyButtonText,
                    user.coins < card.coin_cost && styles.buyButtonTextDisabled
                  ]}>
                    {card.coin_cost} COINS
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Coming Soon Cards */}
        {unavailableCards.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Coming Soon</Text>
            <View style={styles.cardsGrid}>
              {unavailableCards.map(card => (
                <View key={card.id} style={styles.shopCard}>
                  <View style={styles.blurContainer}>
                    <Image
                      source={{ uri: card.front_image_url }}
                      style={[styles.cardImage, styles.blurredImage]}
                      resizeMode="cover"
                      blurRadius={15}
                    />
                    <View style={styles.comingSoonOverlay}>
                      <Ionicons name="time-outline" size={32} color="#FFD700" />
                      <Text style={styles.comingSoonText}>COMING</Text>
                      <Text style={styles.comingSoonText}>SOON</Text>
                    </View>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{card.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buyButton, styles.buyButtonUnavailable]}
                    onPress={() => handlePurchase(card.id, card.coin_cost, card.name, false)}
                  >
                    <Ionicons name="lock-closed" size={16} color="#666" />
                    <Text style={styles.buyButtonTextDisabled}>LOCKED</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  coinIcon: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  // Rare Cards Section
  rareSectionHeader: {
    backgroundColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    backgroundColor: '#2a1a00',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rareSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  rareSectionSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rareCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rareCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#444',
    marginBottom: 16,
  },
  rareCardOwned: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  rareCardImage: {
    width: '100%',
    height: 200,
  },
  rareBlurContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  rareLockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  rareLockedIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  rareRequirement: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressNumbers: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  rareCardInfo: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  rareCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  rareOwnedBadge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  // Celebration Modal
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 24,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  celebrationEmoji: {
    fontSize: 32,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationCardImage: {
    width: 200,
    height: 280,
    borderRadius: 12,
    marginBottom: 16,
  },
  celebrationCardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  celebrationButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },
  celebrationButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Regular Cards
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shopCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  blurContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  blurredImage: {
    opacity: 0.5,
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardInfo: {
    padding: 12,
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardNameHidden: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  ownedText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    padding: 12,
  },
  buyButtonDisabled: {
    backgroundColor: '#333',
  },
  buyButtonUnavailable: {
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  buyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buyButtonTextDisabled: {
    color: '#666',
  },
  spacer: {
    height: 24,
  },
});
