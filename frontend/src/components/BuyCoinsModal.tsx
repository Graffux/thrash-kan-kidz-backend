import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Google Play product IDs mapped to package IDs
const GOOGLE_PLAY_PRODUCTS: Record<string, string> = {
  'small': 'thrash_kan_kidz_coins_200',
  'medium': 'thrash_kan_kidz_coins_500',
  'large': 'thrash_kan_kidz_coins_1000',
};

// react-native-iap is native-only, loaded dynamically at runtime on device builds
// Not installed in dev workspace to avoid Metro bundling issues
let RNIap: any = null;

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
  google_play_product_id?: string;
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
  const [iapConnected, setIapConnected] = useState(false);
  const purchaseListeners = useRef<any[]>([]);

  // Initialize Google Play Billing - only on native builds where react-native-iap is installed
  useEffect(() => {
    // IAP will be enabled in a future build once react-native-iap is added back
    // For now, all purchases go through Stripe fallback
    return () => {
      cleanupIAP();
    };
  }, [visible]);

  const initializeIAP = async () => {
    try {
      await RNIap.initConnection();
      setIapConnected(true);

      // Listen for purchase updates
      const purchaseUpdateSub = RNIap.purchaseUpdatedListener(
        async (purchase: any) => {
          await handlePurchaseUpdate(purchase);
        }
      );
      const purchaseErrorSub = RNIap.purchaseErrorListener(
        (err: any) => {
          if (err.code !== 'E_USER_CANCELLED') {
            setError(`Purchase failed: ${err.message}`);
          }
          setPurchasing(null);
        }
      );
      purchaseListeners.current = [purchaseUpdateSub, purchaseErrorSub];
    } catch (err) {
      console.log('IAP not available:', err);
      setIapConnected(false);
    }
  };

  const cleanupIAP = () => {
    purchaseListeners.current.forEach(sub => sub?.remove?.());
    purchaseListeners.current = [];
    if (RNIap && iapConnected) {
      RNIap.endConnection();
    }
  };

  const handlePurchaseUpdate = async (purchase: any) => {
    if (!user) return;

    try {
      // Verify with backend
      const response = await fetch(`${apiUrl}/api/users/${user.id}/verify-google-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: purchase.productId,
          purchase_token: purchase.purchaseToken,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Acknowledge/consume the purchase
        await RNIap.finishTransaction({ purchase, isConsumable: true });
        
        Alert.alert(
          'Purchase Complete!',
          `You received ${data.coins_granted} coins!${data.bonus_coins > 0 ? ` (includes ${data.bonus_coins} bonus coins!)` : ''}`,
          [{ text: 'Awesome!', onPress: () => { refreshData(); onClose(); } }]
        );
      } else {
        setError('Purchase verification failed');
      }
    } catch (err) {
      console.error('Purchase verification error:', err);
      setError('Failed to verify purchase');
    } finally {
      setPurchasing(null);
    }
  };

  useEffect(() => {
    if (visible && user) {
      fetchPackages();
    }
  }, [visible, user]);

  const fetchPackages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
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

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) return;
    
    setPurchasing(pkg.id);
    setError(null);

    // Use Google Play Billing on Android if available
    if (Platform.OS === 'android' && RNIap && iapConnected) {
      try {
        const googleProductId = GOOGLE_PLAY_PRODUCTS[pkg.id];
        if (!googleProductId) {
          setError('Product not configured');
          setPurchasing(null);
          return;
        }
        await RNIap.requestPurchase({ skus: [googleProductId] });
        // Purchase result handled by purchaseUpdatedListener
      } catch (err: any) {
        if (err.code !== 'E_USER_CANCELLED') {
          setError('Failed to start purchase');
        }
        setPurchasing(null);
      }
      return;
    }

    // Fallback to Stripe for web/unsupported
    try {
      const originUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${apiUrl}/api/users/${user.id}/purchase-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          package_id: pkg.id,
          origin_url: originUrl,
        }),
      });
      
      const data = await response.json();
      
      if (data.checkout_url) {
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

  const FooterContent = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        {Platform.OS === 'android' && iapConnected
          ? 'Secure payment via Google Play'
          : 'Secure payment powered by Stripe'}
      </Text>
    </View>
  );

  const ItemSeparator = () => <View style={{ height: 10 }} />;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Buy Coins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} data-testid="close-buy-coins">
              <Ionicons name="close-circle" size={28} color="#888" />
            </TouchableOpacity>
          </View>
          
          {isFirstPurchase && (
            <View style={styles.bonusBanner}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.bonusText}>
                First purchase bonus: {bonusPercentage}% extra coins!
              </Text>
              <Ionicons name="star" size={18} color="#FFD700" />
            </View>
          )}
          
          <Text style={styles.subtitle}>Choose a coin package</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close-circle" size={18} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.packageList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.packageListContent}
            >
              {packages.map((pkg, index) => (
                <React.Fragment key={pkg.id}>
                  {index > 0 && <ItemSeparator />}
                  <TouchableOpacity
                    style={[
                      styles.packageCard,
                      pkg.best_value && styles.bestValueCard,
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasing !== null}
                    data-testid={`buy-package-${pkg.id}`}
                  >
                    {pkg.best_value && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    )}
                    <View style={styles.packageRow}>
                      <Text style={styles.packageIcon}>{getPackageIcon(pkg.id)}</Text>
                      <View style={styles.packageInfo}>
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <Text style={styles.packageCoins}>
                          {pkg.total_coins || pkg.coins} coins
                          {pkg.bonus_coins ? ` (${pkg.bonus_coins} bonus!)` : ''}
                        </Text>
                      </View>
                      <View style={styles.priceContainer}>
                        {purchasing === pkg.id ? (
                          <ActivityIndicator size="small" color="#FFD700" />
                        ) : (
                          <Text style={styles.priceText}>
                            ${pkg.price.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
              <FooterContent />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFD700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  bonusText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 13,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 12,
  },
  packageList: {
    paddingHorizontal: 16,
  },
  packageListContent: {
    paddingBottom: 16,
  },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bestValueCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestValueText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  packageCoins: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  priceContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  priceText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});
