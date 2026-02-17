import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';

export default function GoalsScreen() {
  const { user, userGoals, allCards } = useApp();

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={64} color="#666" />
          <Text style={styles.lockedText}>Please login to view your goals</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'daily_login':
        return 'calendar';
      case 'profile_complete':
        return 'person';
      case 'collect_coins':
        return 'wallet';
      case 'collect_cards':
        return 'albums';
      default:
        return 'star';
    }
  };

  const getRewardCardName = (cardId: string | null) => {
    if (!cardId) return null;
    const card = allCards.find(c => c.id === cardId);
    return card?.name || 'Mystery Card';
  };

  const completedGoals = userGoals.filter(ug => ug.user_goal.completed);
  const inProgressGoals = userGoals.filter(ug => !ug.user_goal.completed);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>
          {completedGoals.length} / {userGoals.length} Completed
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Overview */}
        <View style={styles.progressOverview}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>
              {userGoals.length > 0
                ? Math.round((completedGoals.length / userGoals.length) * 100)
                : 0}%
            </Text>
            <Text style={styles.progressLabel}>Complete</Text>
          </View>
        </View>

        {/* In Progress */}
        {inProgressGoals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>In Progress</Text>
            {inProgressGoals.map(({ user_goal, goal }) => (
              <View key={user_goal.id} style={styles.goalCard}>
                <View style={styles.goalIcon}>
                  <Ionicons
                    name={getGoalIcon(goal.goal_type) as any}
                    size={24}
                    color="#FFD700"
                  />
                </View>
                <View style={styles.goalContent}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                  
                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(
                              (user_goal.progress / goal.target_value) * 100,
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {user_goal.progress} / {goal.target_value}
                    </Text>
                  </View>

                  {/* Rewards */}
                  <View style={styles.rewardsContainer}>
                    <View style={styles.rewardItem}>
                      <Ionicons name="wallet" size={14} color="#FFD700" />
                      <Text style={styles.rewardText}>+{goal.reward_coins}</Text>
                    </View>
                    {goal.reward_card_id && (
                      <View style={styles.rewardItem}>
                        <Ionicons name="gift" size={14} color="#9932CC" />
                        <Text style={styles.rewardText}>
                          {getRewardCardName(goal.reward_card_id)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Completed */}
        {completedGoals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedGoals.map(({ user_goal, goal }) => (
              <View key={user_goal.id} style={[styles.goalCard, styles.goalCardCompleted]}>
                <View style={[styles.goalIcon, styles.goalIconCompleted]}>
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                </View>
                <View style={styles.goalContent}>
                  <Text style={[styles.goalTitle, styles.goalTitleCompleted]}>
                    {goal.title}
                  </Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {userGoals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No goals available yet</Text>
          </View>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressOverview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  progressPercent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressLabel: {
    fontSize: 12,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  goalCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalCardCompleted: {
    opacity: 0.7,
    borderColor: '#4CAF50',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalIconCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  goalTitleCompleted: {
    color: '#4CAF50',
  },
  goalDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    minWidth: 50,
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#ccc',
    fontSize: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  spacer: {
    height: 24,
  },
});
