import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  username: string;
  coins: number;
  daily_login_streak: number;
  last_login_date: string | null;
  profile_completed: boolean;
  bio: string;
  avatar_url: string;
  created_at: string;
}

interface Card {
  id: string;
  name: string;
  description: string;
  rarity: string;
  front_image_url: string;
  back_image_url: string;
  coin_cost: number;
  available: boolean;
  created_at: string;
  series?: number;
  band?: string;
  card_type?: string;
  base_card_id?: string;
  variant_name?: string;
}

interface UserCard {
  user_card_id: string;
  card: Card;
  quantity: number;
  acquired_at: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  target_value: number;
  reward_coins: number;
  reward_card_id: string | null;
}

interface UserGoal {
  user_goal: {
    id: string;
    user_id: string;
    goal_id: string;
    progress: number;
    completed: boolean;
    completed_at: string | null;
  };
  goal: Goal;
}

interface Trade {
  trade: {
    id: string;
    from_user_id: string;
    to_user_id: string;
    offered_card_ids: string[];
    requested_card_ids: string[];
    status: string;
    created_at: string;
  };
  from_user: User;
  to_user: User;
  offered_cards: Card[];
  requested_cards: Card[];
}

interface AppContextType {
  user: User | null;
  allCards: Card[];
  userCards: UserCard[];
  userGoals: UserGoal[];
  trades: Trade[];
  allUsers: User[];
  loading: boolean;
  apiUrl: string;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  claimDailyLogin: () => Promise<{ streak: number; bonus_coins: number; message: string }>;
  purchaseCard: (cardId: string) => Promise<any>;
  updateProfile: (bio: string) => Promise<void>;
  createTrade: (toUserId: string, offeredCardIds: string[], requestedCardIds: string[]) => Promise<void>;
  acceptTrade: (tradeId: string) => Promise<void>;
  rejectTrade: (tradeId: string) => Promise<void>;
  cancelTrade: (tradeId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    loadCards();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await axios.get(`${API_URL}/api/users/${userId}`);
        setUser(response.data);
      }
    } catch (error) {
      console.log('No saved user found');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cards`);
      setAllCards(response.data);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const [cardsRes, goalsRes, tradesRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${user.id}/cards`),
        axios.get(`${API_URL}/api/users/${user.id}/goals`),
        axios.get(`${API_URL}/api/users/${user.id}/trades`),
        axios.get(`${API_URL}/api/users`)
      ]);
      
      setUserCards(cardsRes.data);
      setUserGoals(goalsRes.data);
      setTrades(tradesRes.data);
      setAllUsers(usersRes.data.filter((u: User) => u.id !== user.id));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const login = async (username: string) => {
    try {
      // Try to get existing user
      try {
        const response = await axios.get(`${API_URL}/api/users/username/${username}`);
        setUser(response.data);
        await AsyncStorage.setItem('userId', response.data.id);
        return;
      } catch (error) {
        // User doesn't exist, create new one
      }
      
      // Create new user
      const response = await axios.post(`${API_URL}/api/users`, { username });
      setUser(response.data);
      await AsyncStorage.setItem('userId', response.data.id);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to login');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setUserCards([]);
    setUserGoals([]);
    setTrades([]);
  };

  const claimDailyLogin = async () => {
    if (!user) throw new Error('Not logged in');
    
    const response = await axios.post(`${API_URL}/api/users/${user.id}/daily-login`);
    
    // Refresh user data
    const userRes = await axios.get(`${API_URL}/api/users/${user.id}`);
    setUser(userRes.data);
    
    // Refresh goals
    const goalsRes = await axios.get(`${API_URL}/api/users/${user.id}/goals`);
    setUserGoals(goalsRes.data);
    
    return response.data;
  };

  const purchaseCard = async (cardId: string) => {
    if (!user) throw new Error('Not logged in');
    
    const response = await axios.post(`${API_URL}/api/users/${user.id}/purchase-card`, {
      user_id: user.id,
      card_id: cardId
    });
    
    // Refresh data
    await refreshData();
    
    // Return the response data (includes newly_unlocked_rare_card if any)
    return response.data;
  };

  const updateProfile = async (bio: string) => {
    if (!user) throw new Error('Not logged in');
    
    const response = await axios.put(`${API_URL}/api/users/${user.id}/profile`, { bio });
    setUser(response.data);
    
    // Refresh goals
    const goalsRes = await axios.get(`${API_URL}/api/users/${user.id}/goals`);
    setUserGoals(goalsRes.data);
  };

  const createTrade = async (toUserId: string, offeredCardIds: string[], requestedCardIds: string[]) => {
    if (!user) throw new Error('Not logged in');
    
    await axios.post(`${API_URL}/api/trades`, {
      from_user_id: user.id,
      to_user_id: toUserId,
      offered_card_ids: offeredCardIds,
      requested_card_ids: requestedCardIds
    });
    
    // Refresh trades
    const tradesRes = await axios.get(`${API_URL}/api/users/${user.id}/trades`);
    setTrades(tradesRes.data);
  };

  const acceptTrade = async (tradeId: string) => {
    if (!user) throw new Error('Not logged in');
    
    await axios.post(`${API_URL}/api/trades/${tradeId}/action`, {
      trade_id: tradeId,
      user_id: user.id,
      action: 'accept'
    });
    
    await refreshData();
  };

  const rejectTrade = async (tradeId: string) => {
    if (!user) throw new Error('Not logged in');
    
    await axios.post(`${API_URL}/api/trades/${tradeId}/action`, {
      trade_id: tradeId,
      user_id: user.id,
      action: 'reject'
    });
    
    // Refresh trades
    const tradesRes = await axios.get(`${API_URL}/api/users/${user.id}/trades`);
    setTrades(tradesRes.data);
  };

  const cancelTrade = async (tradeId: string) => {
    if (!user) throw new Error('Not logged in');
    
    await axios.post(`${API_URL}/api/trades/${tradeId}/action`, {
      trade_id: tradeId,
      user_id: user.id,
      action: 'cancel'
    });
    
    // Refresh trades
    const tradesRes = await axios.get(`${API_URL}/api/users/${user.id}/trades`);
    setTrades(tradesRes.data);
  };

  const refreshData = async () => {
    if (!user) return;
    
    try {
      const [userRes, cardsRes, goalsRes, tradesRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${user.id}`),
        axios.get(`${API_URL}/api/users/${user.id}/cards`),
        axios.get(`${API_URL}/api/users/${user.id}/goals`),
        axios.get(`${API_URL}/api/users/${user.id}/trades`)
      ]);
      
      setUser(userRes.data);
      setUserCards(cardsRes.data);
      setUserGoals(goalsRes.data);
      setTrades(tradesRes.data);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        allCards,
        userCards,
        userGoals,
        trades,
        allUsers,
        loading,
        apiUrl: API_URL,
        login,
        logout,
        claimDailyLogin,
        purchaseCard,
        updateProfile,
        createTrade,
        acceptTrade,
        rejectTrade,
        cancelTrade,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
