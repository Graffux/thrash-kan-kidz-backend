import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const GOOGLE_PLAY_PRODUCTS: Record<string, string> = {
  'small': 'thrash_kan_kidz_coins_200',
  'medium': 'thrash_kan_kidz_coins_500',
  'large': 'thrash_kan_kidz_coins_1000',
};

// Dynamically import expo-iap to avoid crashes on web
let useIAP: any = null;
try {
  if (Platform.OS === 'android') {
    const expoIap = require('expo-iap');
    useIAP = expoIap.useIAP;
  }
} catch (e) {
  console.log('expo-iap not available');
}

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: string;
  bonus: number;
}

interface BuyCoinsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Wrapper component that handles IAP on Android
function BuyCoinsContent({ visible, onClose }: BuyCoinsModalProps) {
  const { user, apiUrl, refreshData } = useApp();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [bonusPercentage, setBonusPercentage] = useState(0);

  // Use expo-iap hook if available
  const iap = useIAP ? useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      try {
        // Verify purchase on backend
        const response = await fetch(`${apiUrl}/api/users/${user?.id}/verify-google-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase_token: purchase.purchaseToken || purchase.transactionReceipt,
            product_id: purchase.productId,
          }),
        });
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success!', `${data.coins_added} coins added to your account!`);
          refreshData();
          onClose();
        } else {
          setError('Purchase verification failed');
        }
      } catch (err) {
        setError('Failed to verify purchase');
      } finally {
        setPurchasing(null);
      }
      // Finish the transaction (consumable since they can buy again)
      if (iap?.finishTransaction) {
        await iap.finishTransaction({ purchase, isConsumable: true });
      }
    },
    onPurchaseError: (err: any) => {
      if (err?.code !== 'E_USER_CANCELLED') {
        setError('Purchase failed. Please try again.');
      }
      setPurchasing(null);
    },
  }) : null;

  useEffect(() => {
    if (visible) {
      fetchPackages();
      // Fetch products from Google Play
      if (iap?.connected && iap?.fetchProducts) {
        const productIds = Object.values(GOOGLE_PLAY_PRODUCTS);
        iap.fetchProducts(productIds);
      }
    }
  }, [visible, iap?.connected]);

  const fetchPackages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/coin-packages`);
      const data = await response.json();
      setPackages(data.packages || []);
      setIsFirstPurchase(data.is_first_purchase || false);
      setBonusPercentage(data.first_purchase_bonus_percentage || 0);
    } catch (err) {
      setError('Failed to load coin packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) return;
    setPurchasing(pkg.id);
    setError(null);

    // Use Google Play Billing on Android
    if (Platform.OS === 'android' && iap?.connected && iap?.requestPurchase) {
      const googleProductId = GOOGLE_PLAY_PRODUCTS[pkg.id];
      if (!googleProductId) {
        setError('Product not configured');
        setPurchasing(null);
        return;
      }
      
      // Find the product from fetched products
      const product = iap.products?.find((p: any) => p.productId === googleProductId);
      if (product) {
        try {
          await iap.requestPurchase(product);
        } catch (err: any) {
          if (err?.code !== 'E_USER_CANCELLED') {
            setError('Failed to start purchase');
          }
          setPurchasing(null);
        }
      } else {
        setError('Product not available in store');
        setPurchasing(null);
      }
      return;
    }

    // Fallback: just show error for non-Android
    setError('In-app purchases are only available on Android');
    setPurchasing(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Buy Coins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {isFirstPurchase && (
            <View style={styles.firstPurchaseBanner}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.firstPurchaseText}>FIRST PURCHASE - {bonusPercentage}% BONUS COINS!</Text>
              <Ionicons name="star" size={20} color="#FFD700" />
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.packagesContainer}>
              {packages.map((pkg: any) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[styles.packageCard, purchasing === pkg.id && styles.packageCardDisabled]}
                  onPress={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                >
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packageCoins}>
                      {pkg.first_purchase_bonus ? `${pkg.total_coins} coins` : `${pkg.coins} coins`}
                    </Text>
                    {pkg.first_purchase_bonus && pkg.bonus_coins > 0 && (
                      <Text style={styles.packageBonus}>+{pkg.bonus_coins} bonus coins!</Text>
                    )}
                  </View>
                  <View style={styles.packagePriceContainer}>
                    {purchasing === pkg.id ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.packagePrice}>${pkg.price}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {Platform.OS === 'android' && !iap?.connected && (
            <Text style={styles.connectingText}>Connecting to Google Play...</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Default export wrapper
export default function BuyCoinsModal(props: BuyCoinsModalProps) {
  return <BuyCoinsContent {...props} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 6,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    textAlign: 'center',
  },
  firstPurchaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  firstPurchaseText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  packagesContainer: {
    gap: 12,
  },
  packageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  packageCardDisabled: {
    opacity: 0.5,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  packageCoins: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  packageBonus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  packagePriceContainer: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  packagePrice: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectingText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
