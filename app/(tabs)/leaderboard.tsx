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
  documentId,
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

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

  // 🔥 GLOBAL (računa iz memories kolekcije - TAČNO)
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

  // 👥 FRIENDS (FIX: uključuje tebe + tačan count)
  const loadFriends = async (userId: string) => {
    const followSnap = await getDocs(
      query(collection(db, 'following'), where('followerId', '==', userId))
    );

    const friendIds = followSnap.docs.map((d) => d.data().followingId);

    // 🔥 UBACI SEBE U LISTU
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

  // 📅 WEEKLY (iz createdAt)
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

  const myRank =
    currentUserId
      ? entries.findIndex((e) => e.id === currentUserId) + 1
      : -1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>
          🏆 Leaderboard
        </Text>

        {tab === 'friends' && currentUserId && (
          <Text style={{ textAlign: 'center', color: colors.subtext }}>
            Tvoj rank: {myRank > 0 ? myRank : 'Nisi u listi'}
          </Text>
        )}
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {(['global', 'friends', 'weekly'] as TabType[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              { backgroundColor: tab === t ? colors.primary : colors.card },
            ]}
          >
            <Text style={{ color: tab === t ? '#fff' : colors.text }}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LOADING */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.subtext }}>
              Nema podataka
            </Text>
          }
          renderItem={({ item, index }) => {
            const isMe = item.id === currentUserId;
            const medal = getMedal(index);

            return (
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: isMe
                      ? colors.primary + '22'
                      : colors.card,
                  },
                ]}
              >
                <Text style={styles.rank}>
                  {medal ? medal : index + 1}
                </Text>

                <Text style={{ flex: 1, color: colors.text }}>
                  {item.username} {isMe ? '(Ti)' : ''}
                </Text>

                <Text style={{ color: colors.primary }}>
                  {item.memoriesCount}
                </Text>
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
    padding: 16,
  },

  title: {
    fontSize: 22,
  },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },

  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  list: {
    padding: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
  },

  rank: {
    width: 40,
  },
});