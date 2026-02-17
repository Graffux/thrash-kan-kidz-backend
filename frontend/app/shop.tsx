import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ShopScreen() {
  const { user, allCards, userCards, purchaseCard } = useApp();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color="#666" />
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
              await purchaseCard(cardId);
              Alert.alert('Success!', `You got ${cardName}!`);
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

  // Separate available and unavailable cards
  const availableCards = allCards.filter(card => card.available !== false);
  const unavailableCards = allCards.filter(card => card.available === false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Card Shop</Text>
          <Text style={styles.subtitle}>Buy cards with your coins</Text>
        </View>
        <View style={styles.coinDisplay}>
          <Ionicons name="cash-outline" size={20} color="#FFD700" />
          <Text style={styles.coinText}>{user.coins}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                  <>
                    <Ionicons name="logo-usd" size={16} color={user.coins >= card.coin_cost ? '#000' : '#666'} />
                    <Text style={[
                      styles.buyButtonText,
                      user.coins < card.coin_cost && styles.buyButtonTextDisabled
                    ]}>
                      {card.coin_cost}
                    </Text>
                  </>
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
    gap: 8,
  },
  coinText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
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
    gap: 6,
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
