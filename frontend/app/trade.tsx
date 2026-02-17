import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';

const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';

export default function TradeScreen() {
  const {
    user,
    userCards,
    trades,
    allUsers,
    createTrade,
    acceptTrade,
    rejectTrade,
    cancelTrade,
    refreshData,
  } = useApp();

  const [showNewTrade, setShowNewTrade] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [offeredCards, setOfferedCards] = useState<string[]>([]);
  const [requestedCards, setRequestedCards] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.backgroundOverlay} />
        <View style={styles.centerContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>Please login to trade cards</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingTrades = trades.filter(
    t => t.trade.status === 'pending'
  );

  const incomingTrades = pendingTrades.filter(
    t => t.trade.to_user_id === user.id
  );

  const outgoingTrades = pendingTrades.filter(
    t => t.trade.from_user_id === user.id
  );

  const completedTrades = trades.filter(
    t => t.trade.status === 'accepted' || t.trade.status === 'rejected' || t.trade.status === 'cancelled'
  );

  const handleCreateTrade = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to trade with');
      return;
    }
    if (offeredCards.length === 0 && requestedCards.length === 0) {
      Alert.alert('Error', 'Please select cards to trade');
      return;
    }

    setCreating(true);
    try {
      await createTrade(selectedUser.id, offeredCards, requestedCards);
      Alert.alert('Success', 'Trade offer sent!');
      setShowNewTrade(false);
      setSelectedUser(null);
      setOfferedCards([]);
      setRequestedCards([]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create trade');
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptTrade = async (tradeId: string) => {
    setProcessing(tradeId);
    try {
      await acceptTrade(tradeId);
      Alert.alert('Success', 'Trade completed!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept trade');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectTrade = async (tradeId: string) => {
    setProcessing(tradeId);
    try {
      await rejectTrade(tradeId);
      Alert.alert('Done', 'Trade rejected');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reject trade');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    setProcessing(tradeId);
    try {
      await cancelTrade(tradeId);
      Alert.alert('Done', 'Trade cancelled');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel trade');
    } finally {
      setProcessing(null);
    }
  };

  const toggleOfferedCard = (cardId: string) => {
    setOfferedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const toggleRequestedCard = (cardId: string) => {
    setRequestedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

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

  const renderTradeCard = (trade: any, isIncoming: boolean) => (
    <View key={trade.trade.id} style={styles.tradeCard}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeUsers}>
          <Text style={styles.tradeUserLabel}>
            {isIncoming ? 'From' : 'To'}
          </Text>
          <Text style={styles.tradeUsername}>
            {isIncoming ? trade.from_user?.username : trade.to_user?.username}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.trade.status) }]}>
          <Text style={styles.statusText}>{trade.trade.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.tradeCardsContainer}>
        <View style={styles.tradeCardsSection}>
          <Text style={styles.tradeCardsLabel}>Offered:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trade.offered_cards.map((card: any) => (
              <View key={card.id} style={styles.miniCard}>
                <Image
                  source={{ uri: card.front_image_url }}
                  style={styles.miniCardImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <Ionicons name="swap-horizontal" size={24} color="#666" style={styles.swapIcon} />

        <View style={styles.tradeCardsSection}>
          <Text style={styles.tradeCardsLabel}>Requested:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trade.requested_cards.map((card: any) => (
              <View key={card.id} style={styles.miniCard}>
                <Image
                  source={{ uri: card.front_image_url }}
                  style={styles.miniCardImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {trade.trade.status === 'pending' && (
        <View style={styles.tradeActions}>
          {isIncoming ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptTrade(trade.trade.id)}
                disabled={processing === trade.trade.id}
              >
                {processing === trade.trade.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectTrade(trade.trade.id)}
                disabled={processing === trade.trade.id}
              >
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelTrade(trade.trade.id)}
              disabled={processing === trade.trade.id}
            >
              {processing === trade.trade.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'cancelled':
        return '#666';
      default:
        return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.backgroundOverlay} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Trade Center</Text>
          <Text style={styles.subtitle}>Trade cards with other collectors</Text>
        </View>
        <TouchableOpacity
          style={styles.newTradeButton}
          onPress={() => setShowNewTrade(true)}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Incoming Trades */}
        {incomingTrades.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Ionicons name="mail" size={18} color="#FFD700" /> Incoming Offers ({incomingTrades.length})
            </Text>
            {incomingTrades.map(trade => renderTradeCard(trade, true))}
          </>
        )}

        {/* Outgoing Trades */}
        {outgoingTrades.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              <Ionicons name="send" size={18} color="#4CAF50" /> Your Offers ({outgoingTrades.length})
            </Text>
            {outgoingTrades.map(trade => renderTradeCard(trade, false))}
          </>
        )}

        {/* Empty State */}
        {pendingTrades.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal" size={64} color="#666" />
            <Text style={styles.emptyText}>No active trades</Text>
            <Text style={styles.emptySubtext}>Start trading with other collectors!</Text>
          </View>
        )}

        {/* Trade History */}
        {completedTrades.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Trade History</Text>
            {completedTrades.slice(0, 5).map(trade => (
              <View key={trade.trade.id} style={[styles.tradeCard, styles.historyCard]}>
                <View style={styles.tradeHeader}>
                  <Text style={styles.historyText}>
                    {trade.from_user?.username} ↔ {trade.to_user?.username}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.trade.status) }]}>
                    <Text style={styles.statusText}>{trade.trade.status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* New Trade Modal */}
      <Modal
        visible={showNewTrade}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewTrade(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Trade</Text>
              <TouchableOpacity onPress={() => setShowNewTrade(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Select User */}
              <Text style={styles.modalSectionTitle}>Select User</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userList}>
                {allUsers.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.userItem,
                      selectedUser?.id === u.id && styles.userItemSelected,
                    ]}
                    onPress={() => setSelectedUser(u)}
                  >
                    <Ionicons name="person-circle" size={40} color={selectedUser?.id === u.id ? '#FFD700' : '#666'} />
                    <Text style={[
                      styles.userItemName,
                      selectedUser?.id === u.id && styles.userItemNameSelected,
                    ]}>
                      {u.username}
                    </Text>
                  </TouchableOpacity>
                ))}
                {allUsers.length === 0 && (
                  <Text style={styles.noUsersText}>No other users available</Text>
                )}
              </ScrollView>

              {/* Your Cards to Offer */}
              <Text style={styles.modalSectionTitle}>Your Cards to Offer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userCards.map(uc => (
                  <TouchableOpacity
                    key={uc.card.id}
                    style={[
                      styles.selectableCard,
                      offeredCards.includes(uc.card.id) && styles.selectableCardSelected,
                    ]}
                    onPress={() => toggleOfferedCard(uc.card.id)}
                  >
                    <Image
                      source={{ uri: uc.card.front_image_url }}
                      style={styles.selectableCardImage}
                      resizeMode="cover"
                    />
                    {offeredCards.includes(uc.card.id) && (
                      <View style={styles.selectedOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Request from Selected User */}
              {selectedUser && (
                <>
                  <Text style={styles.modalSectionTitle}>Request from {selectedUser.username}</Text>
                  <Text style={styles.modalHint}>Select cards you want in exchange</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {userCards.filter(uc => uc.quantity > 0).map(uc => (
                      <TouchableOpacity
                        key={`req_${uc.card.id}`}
                        style={[
                          styles.selectableCard,
                          requestedCards.includes(uc.card.id) && styles.selectableCardSelected,
                        ]}
                        onPress={() => toggleRequestedCard(uc.card.id)}
                      >
                        <Image
                          source={{ uri: uc.card.front_image_url }}
                          style={styles.selectableCardImage}
                          resizeMode="cover"
                        />
                        {requestedCards.includes(uc.card.id) && (
                          <View style={styles.selectedOverlay}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.createTradeButton,
                (!selectedUser || (offeredCards.length === 0 && requestedCards.length === 0)) &&
                  styles.createTradeButtonDisabled,
              ]}
              onPress={handleCreateTrade}
              disabled={creating || !selectedUser || (offeredCards.length === 0 && requestedCards.length === 0)}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.createTradeButtonText}>Send Trade Offer</Text>
              )}
            </TouchableOpacity>
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
  newTradeButton: {
    backgroundColor: '#FFD700',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  tradeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyCard: {
    opacity: 0.6,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeUsers: {
    flex: 1,
  },
  tradeUserLabel: {
    fontSize: 12,
    color: '#888',
  },
  tradeUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyText: {
    fontSize: 14,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tradeCardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeCardsSection: {
    flex: 1,
  },
  tradeCardsLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  swapIcon: {
    marginHorizontal: 8,
  },
  miniCard: {
    width: 50,
    height: 70,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 6,
    backgroundColor: '#333',
  },
  miniCardImage: {
    width: '100%',
    height: '100%',
  },
  tradeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
  },
  spacer: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 16,
  },
  modalHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  userList: {
    flexDirection: 'row',
  },
  userItem: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#0f0f1a',
  },
  userItemSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  userItemName: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  userItemNameSelected: {
    color: '#FFD700',
  },
  noUsersText: {
    color: '#666',
    fontSize: 14,
    padding: 20,
  },
  selectableCard: {
    width: 80,
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#333',
  },
  selectableCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectableCardImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTradeButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createTradeButtonDisabled: {
    backgroundColor: '#333',
  },
  createTradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
