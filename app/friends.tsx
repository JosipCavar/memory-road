import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';
import { followUser, unfollowUser, isFollowing, getFollowing, searchUsers } from '../lib/friends';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firestore';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

export default function FriendsScreen() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const loadFriends = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setCurrentUserId(session.user.id);

      const ids = await getFollowing(session.user.id);
      setFollowingIds(ids);

      const profiles = await Promise.all(
        ids.map(async (id) => {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            return { id, ...userDoc.data() } as UserProfile;
          }
          return null;
        })
      );

      setFollowing(profiles.filter(Boolean) as UserProfile[]);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchText);
      const filtered = results.filter(u => u.id !== currentUserId);
      setSearchResults(filtered);
    } catch (error: any) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!currentUserId) return;
    try {
      if (followingIds.includes(targetId)) {
        await unfollowUser(currentUserId, targetId);
        setFollowingIds(prev => prev.filter(id => id !== targetId));
        setFollowing(prev => prev.filter(u => u.id !== targetId));
      } else {
        await followUser(currentUserId, targetId);
        setFollowingIds(prev => [...prev, targetId]);
        await loadFriends();
      }
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    }
  };

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isFollowingUser = followingIds.includes(item.id);
    return (
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.username?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
          <Text style={[styles.email, { color: colors.subtext }]}>{item.email}</Text>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[styles.followButton, { backgroundColor: isFollowingUser ? colors.border : colors.primary }]}
            onPress={() => handleFollow(item.id)}
          >
            <Text style={[styles.followButtonText, { color: isFollowingUser ? colors.text : '#fff' }]}>
              {isFollowingUser ? 'Otprati' : 'Prati'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewMapButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push(`/share/${item.id}`)}
          >
            <Text style={[styles.viewMapButtonText, { color: colors.primary }]}>🗺️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>👥 Prijatelji</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Pratiš {following.length} korisnika
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="🔍 Pretraži korisnike..."
          placeholderTextColor={colors.subtext}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Traži</Text>
        </TouchableOpacity>
      </View>

      {/* Search rezultati */}
      {searchResults.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rezultati pretrage</Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Lista prijatelja */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pratim</Text>
        {following.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            Ne pratiš još nikog — pretraži korisnike!
          </Text>
        ) : (
          <FlatList
            data={following}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  searchButton: {
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: 'bold' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 12 },
  userActions: { flexDirection: 'row', gap: 8 },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followButtonText: { fontSize: 13, fontWeight: 'bold' },
  viewMapButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewMapButtonText: { fontSize: 16 },
});