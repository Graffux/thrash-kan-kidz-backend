import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  currency: string;
  description: string;
  bonus_coins?: number;
  total_coins?: number;
  first_purchase_bonus?: boolean;
  effective_coins_per_dollar?: number;
  best_value?: boolean;
}

interface BuyCoinsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BuyCoinsModal({ visible, onClose }: BuyCoinsModalProps) {
  const { user, apiUrl, refreshData } = useApp();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [bonusPercentage, setBonusPercentage] = useState(0);

  useEffect(() => {
    if (visible && user) {
      fetchPackages();
    }
  }, [visible, user]);

  const fetchPackages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Use the user-specific endpoint to get bonus info
      const response = await fetch(`${apiUrl}/api/users/${user.id}/coin-packages`);
      const data = await response.json();
      setPackages(data.packages || []);
      setIsFirstPurchase(data.is_first_purchase || false);
      setBonusPercentage(data.first_purchase_bonus_percentage || 0);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError('Failed to load coin packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!user) return;
    
    setPurchasing(packageId);
    setError(null);
    
    try {
      // Get the origin URL for redirects - use environment variable for Expo compatibility
      const originUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      const response = await fetch(`${apiUrl}/api/users/${user.id}/purchase-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          package_id: packageId,
          origin_url: originUrl,
        }),
      });
      
      const data = await response.json();
      
      if (data.checkout_url) {
        // Open Stripe checkout in browser
        if (Platform.OS === 'web') {
          window.location.href = data.checkout_url;
        } else {
          await Linking.openURL(data.checkout_url);
        }
        onClose();
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError('Failed to initiate purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const getPackageIcon = (packageId: string) => {
    switch (packageId) {
      case 'small': return '💰';
      case 'medium': return '💎';
      case 'large': return '👑';
      default: return '🪙';
    }
  };

  // Footer component for the content
  const FooterContent = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Secure payment powered by Stripe
      </Text>
      <View style={styles.iapNote}>
        <Ionicons name="information-circle-outline" size={14} color="#888" />
        <Text style={styles.iapNoteText}>
          In-App Purchases coming soon
        </Text>
      </View>
    </View>
  );

  // Item separator for spacing
  const ItemSeparator = () => <View style={{ height: 10 }} />;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Buy Coins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
          >
            {isFirstPurchase && (
              <View style={styles.firstPurchaseBanner}>
                <Text style={styles.firstPurchaseIcon}>🎉</Text>
                <View style={styles.firstPurchaseTextContainer}>
                  <Text style={styles.firstPurchaseTitle}>First Purchase Bonus!</Text>
                  <Text style={styles.firstPurchaseSubtitle}>
                    Get {bonusPercentage}% extra coins on your first purchase!
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.subtitle}>Choose a coin package</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchPackages} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.packagesContainer}>
                {packages.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      pkg.best_value && styles.packageCardBestValue,
                    ]}
                    onPress={() => handlePurchase(pkg.id)}
                    disabled={purchasing !== null}
                  >
                    {pkg.best_value && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    )}
                    
                    <Text style={styles.packageIcon}>{getPackageIcon(pkg.id)}</Text>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    
                    <View style={styles.coinsContainer}>
                      {pkg.bonus_coins && pkg.bonus_coins > 0 ? (
                        <>
                          <Text style={styles.packageCoins}>{pkg.total_coins?.toLocaleString()}</Text>
                          <View style={styles.bonusBadge}>
                            <Text style={styles.bonusText}>+{pkg.bonus_coins}</Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.packageCoins}>{pkg.coins.toLocaleString()}</Text>
                      )}
                      <Text style={styles.coinsLabel}>Coins</Text>
                    </View>
                    
                    <View style={[
                      styles.priceButton,
                      pkg.best_value && styles.priceButtonBestValue,
                    ]}>
                      {purchasing === pkg.id ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.priceText}>${pkg.price.toFixed(2)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <FooterContent />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    padding: 4,
  },
  firstPurchaseBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  firstPurchaseIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  firstPurchaseTextContainer: {
    flex: 1,
  },
  firstPurchaseTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  firstPurchaseSubtitle: {
    color: '#81C784',
    fontSize: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  packagesContainer: {
    gap: 10,
  },
  packageCard: {
    backgroundColor: '#252540',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
  },
  packageCardBestValue: {
    borderColor: '#FFD700',
    backgroundColor: '#2a2a45',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bestValueText: {
    color: '#000',
    fontSize: 7,
    fontWeight: 'bold',
  },
  packageIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  packageName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  coinsContainer: {
    alignItems: 'center',
    marginVertical: 2,
  },
  packageCoins: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  coinsLabel: {
    fontSize: 9,
    color: '#888',
    marginTop: 0,
  },
  bonusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 1,
  },
  bonusText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  savingsText: {
    fontSize: 8,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 60,
    alignItems: 'center',
  },
  priceButtonBestValue: {
    backgroundColor: '#FFD700',
  },
  priceText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 10,
  },
  iapNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  iapNoteText: {
    color: '#888',
    fontSize: 9,
  },
});
