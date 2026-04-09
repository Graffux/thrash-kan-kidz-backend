import React from 'react';
import { Tabs } from 'expo-router';
import { AppProvider } from '../src/context/AppContext';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab icon component using emojis for reliable rendering
const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{emoji}</Text>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Use a much larger minimum padding to avoid OS nav buttons
  // Android gesture nav bar is typically 48px, add extra buffer
  const bottomPadding = Math.max(insets.bottom, 48);
  
  return (
    <AppProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            { 
              paddingBottom: bottomPadding,
              height: 70 + bottomPadding,
              marginBottom: Platform.OS === 'android' ? 0 : 0,
            }
          ],
          tabBarActiveTintColor: '#FFD700',
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Collection',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🃏" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: 'Shop',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🛒" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏆" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="trade"
          options={{
            title: 'Trade',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🔄" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👤" focused={focused} />
            ),
          }}
        />
        {/* Hidden screens - not shown in tab bar */}
        <Tabs.Screen
          name="privacy"
          options={{
            title: 'Privacy Policy',
            tabBarButton: () => null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="payment-success"
          options={{
            title: 'Payment Success',
            tabBarButton: () => null, // Hide from tab bar
          }}
        />
      </Tabs>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#333',
    borderTopWidth: 1,
    paddingTop: 8,
    // Remove position absolute - let it flow naturally with safe area
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  tabIcon: {
    fontSize: 28,
  },
  tabIconFocused: {
    transform: [{ scale: 1.2 }],
  },
});
