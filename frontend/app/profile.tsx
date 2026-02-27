import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';

const BACKGROUND_IMAGE = 'https://customer-assets.emergentagent.com/job_earn-cards/artifacts/zgy2com2_enhanced-1771247671181.jpg';

export default function ProfileScreen() {
  const { user, userCards, userGoals, allCards, logout, updateProfile, apiUrl } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
        <View style={styles.backgroundOverlay} />
        <View style={styles.centerContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>Please login to view your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(bio);
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Calculate stats
  const totalCards = userCards.reduce((sum, uc) => sum + uc.quantity, 0);
  const uniqueCards = userCards.length;
  const commonCards = allCards.filter(c => c.rarity !== 'rare' && c.available !== false).length;
  const completedGoals = userGoals.filter(ug => ug.user_goal.completed).length;
  const totalGoals = userGoals.length;

  // Calculate collection completion percentage
  const collectionProgress = commonCards > 0 ? Math.round((uniqueCards / commonCards) * 100) : 0;

  // Format date
  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: BACKGROUND_IMAGE }} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.backgroundOverlay} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>🤘</Text>
          </View>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>💰</Text>
              <Text style={styles.statValue}>{user.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{user.daily_login_streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🃏</Text>
              <Text style={styles.statValue}>{totalCards}</Text>
              <Text style={styles.statLabel}>Total Cards</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{uniqueCards}</Text>
              <Text style={styles.statLabel}>Unique Cards</Text>
            </View>
          </View>
        </View>

        {/* Collection Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>🏆 Collection Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Cards Collected</Text>
              <Text style={styles.progressPercent}>{collectionProgress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${collectionProgress}%` }]} />
            </View>
            <Text style={styles.progressSubtext}>
              {uniqueCards} of {commonCards} unique cards
            </Text>
          </View>
          
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Goals Completed</Text>
              <Text style={styles.progressPercent}>
                {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  styles.progressBarGreen,
                  { width: `${totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressSubtext}>
              {completedGoals} of {totalGoals} goals
            </Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <View style={styles.bioHeader}>
            <Text style={styles.sectionTitle}>📝 About Me</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {editing ? (
            <View style={styles.bioEditContainer}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#666"
                multiline
                maxLength={200}
              />
              <View style={styles.bioActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setBio(user.bio || '');
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>
                {user.bio || 'No bio yet. Tap Edit to add one!'}
              </Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>⚙️ Account</Text>
          
          <View style={styles.accountCard}>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Username</Text>
              <Text style={styles.accountValue}>{user.username}</Text>
            </View>
            
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>User ID</Text>
              <Text style={styles.accountValueSmall}>{user.id.slice(0, 8)}...</Text>
            </View>
            
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Last Login</Text>
              <Text style={styles.accountValue}>
                {user.last_login_date 
                  ? new Date(user.last_login_date).toLocaleDateString()
                  : 'Today'}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thrash Kan Kidz v1.0</Text>
          <Text style={styles.footerSubtext}>Collect 'em all! 🤘</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#888',
  },
  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  // Progress Section
  progressSection: {
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  progressBarGreen: {
    backgroundColor: '#4CAF50',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#888',
  },
  // Bio Section
  bioSection: {
    marginBottom: 24,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  bioCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  bioText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  bioEditContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  bioInput: {
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Account Section
  accountSection: {
    marginBottom: 24,
  },
  accountCard: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  accountLabel: {
    fontSize: 14,
    color: '#888',
  },
  accountValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  accountValueSmall: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F44336',
    marginBottom: 24,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerSubtext: {
    color: '#444',
    fontSize: 12,
    marginTop: 4,
  },
});
