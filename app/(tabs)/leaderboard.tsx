import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

interface LeaderboardEntry {
  id: string;
  username: string;
  memoriesCount: number;
}

type TabType = 'global' | 'friends' | 'weekly';

const TAB_LABELS = {
  global: '🌍 Globalno',
  friends: '👥 Prijatelji',
  weekly: '📅 Tjedni',
};

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('global');
  const { colors, fonts } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [tab])
  );

  const loadData = async () => {
    setLoading(true);
    setEntries([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);
      if (!userId) return;

      if (tab === 'global') await loadGlobal();
      if (tab === 'friends') await loadFriends(userId);
      if (tab === 'weekly') await loadWeekly();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadGlobal = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const memoriesSnap = await getDocs(collection(db, 'memories'));

    const counts: Record<string, number> = {};
    memoriesSnap.docs.forEach((doc) => {
      const userId = doc.data().userId;
      counts[userId] = (counts[userId] || 0) + 1;
    });

    const data: LeaderboardEntry[] = usersSnap.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      memoriesCount: counts[doc.id] || 0,
    }));

    data.sort((a, b) => b.memoriesCount - a.memoriesCount);
    setEntries(data);
  };

  const loadFriends = async (userId: string) => {
    const followSnap = await getDocs(
      query(collection(db, 'following'), where('followerId', '==', userId))
    );

    const friendIds = followSnap.docs.map((d) => d.data().followingId);
    const allIds = [...friendIds, userId];

    if (allIds.length === 0) {
      setEntries([]);
      return;
    }

    const memoriesSnap = await getDocs(collection(db, 'memories'));
    const counts: Record<string, number> = {};
    memoriesSnap.docs.forEach((doc) => {
      const uid = doc.data().userId;
      if (allIds.includes(uid)) {
        counts[uid] = (counts[uid] || 0) + 1;
      }
    });

    const usersSnap = await getDocs(collection(db, 'users'));
    const data: LeaderboardEntry[] = usersSnap.docs
      .filter((doc) => allIds.includes(doc.id))
      .map((doc) => ({
        id: doc.id,
        username: doc.data().username,
        memoriesCount: counts[doc.id] || 0,
      }))
      .sort((a, b) => b.memoriesCount - a.memoriesCount);

    setEntries(data);
  };

  const loadWeekly = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const memoriesSnap = await getDocs(collection(db, 'memories'));

    const now = new Date();
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - 7);

    const counts: Record<string, number> = {};
    memoriesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const date = new Date(data.createdAt);
      if (date >= startOfWeek) {
        const uid = data.userId;
        counts[uid] = (counts[uid] || 0) + 1;
      }
    });

    const data: LeaderboardEntry[] = usersSnap.docs.map((doc) => ({
      id: doc.id,
      username: doc.data().username,
      memoriesCount: counts[doc.id] || 0,
    }));

    data.sort((a, b) => b.memoriesCount - a.memoriesCount);
    setEntries(data);
  };

  const getMedal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return null;
  };

  const myRank = currentUserId
    ? entries.findIndex((e) => e.id === currentUserId) + 1
    : -1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>
          🏆 Leaderboard
        </Text>
        {tab === 'friends' && currentUserId && myRank > 0 && (
          <Text style={[styles.myRank, { color: colors.subtext, fontFamily: fonts.regular }]}>
            Tvoj rank: #{myRank}
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['global', 'friends', 'weekly'] as TabType[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              { backgroundColor: tab === t ? colors.primary : 'transparent' },
            ]}
          >
            <Text style={[
              styles.tabText,
              {
                color: tab === t ? '#fff' : colors.subtext,
                fontFamily: fonts.bold,
              }
            ]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.subtext, fontFamily: fonts.regular, fontSize: 16 }}>
                Nema podataka
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.id === currentUserId;
            const medal = getMedal(index);

            return (
              <View style={[
                styles.row,
                {
                  backgroundColor: isMe ? colors.primary + '22' : colors.card,
                  borderColor: isMe ? colors.primary : colors.border,
                  borderWidth: 1,
                }
              ]}>
                <View style={styles.rankContainer}>
                  {medal ? (
                    <Text style={styles.medal}>{medal}</Text>
                  ) : (
                    <Text style={[styles.rankNumber, { color: colors.subtext, fontFamily: fonts.bold }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                <Text style={[styles.username, { color: colors.text, fontFamily: fonts.bold }]}>
                  {item.username} {isMe ? '👤' : ''}
                </Text>

                <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary, fontFamily: fonts.bold }]}>
                    {item.memoriesCount} 📸
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    padding: 24,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28, marginBottom: 4 },
  myRank: { fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: { fontSize: 12 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  medal: { fontSize: 24 },
  rankNumber: { fontSize: 18 },
  username: { flex: 1, fontSize: 16 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 14 },
});