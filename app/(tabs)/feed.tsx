import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Memory {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
}

export default function FeedScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState('');
  const [liking, setLiking] = useState<string | null>(null);
  const likingRef = useRef(false);
  const { colors, fonts } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const loadFeed = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }

      const q = query(
        collection(db, 'memories'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const memoriesData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Memory[];

      // Dohvati avatarUrl za svakog korisnika
      const userIds = [...new Set(memoriesData.map(m => m.userId))];
      const userAvatars: Record<string, string> = {};

      await Promise.all(
        userIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            userAvatars[uid] = userDoc.data().avatarUrl || '';
          }
        })
      );

      // Dodaj avatarUrl na svaku uspomenu
      const data = memoriesData.map(m => ({
        ...m,
        avatarUrl: userAvatars[m.userId] || undefined,
      }));

      setMemories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (memory: Memory) => {
    if (likingRef.current) return;
    likingRef.current = true;
    setLiking(memory.id);

    try {
      const memoryRef = doc(db, 'memories', memory.id);
      const hasLiked = memory.likedBy?.includes(userId);

      if (hasLiked) {
        await updateDoc(memoryRef, {
          likedBy: arrayRemove(userId),
          likes: increment(-1),
        });
      } else {
        await updateDoc(memoryRef, {
          likedBy: arrayUnion(userId),
          likes: increment(1),
        });

        // Kreiraj notifikaciju samo ako nije tvoja uspomena
        if (memory.userId !== userId) {
          await addDoc(collection(db, 'notifications'), {
            toUserId: memory.userId,
            fromUserId: userId,
            type: 'like',
            memoryId: memory.id,
            memoryTitle: memory.title,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Ažuriraj lokalno
      setMemories(prev => prev.map(m => {
        if (m.id !== memory.id) return m;
        const liked = m.likedBy?.includes(userId);
        return {
          ...m,
          likes: liked ? m.likes - 1 : m.likes + 1,
          likedBy: liked
            ? m.likedBy.filter(id => id !== userId)
            : [...(m.likedBy || []), userId],
        };
      }));

    } catch (error) {
      console.error(error);
    } finally {
      likingRef.current = false;
      setLiking(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        padding: 24,
        paddingTop: 48,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{
          fontSize: 28,
          color: colors.text,
          fontFamily: fonts.bold,
        }}>
          🗺️ Otkrij
        </Text>
        <Text style={{
          fontSize: 14,
          color: colors.subtext,
          fontFamily: fonts.regular,
          marginTop: 4,
        }}>
          Uspomene zajednice
        </Text>
      </View>

      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 }}>
            <Text style={{ color: colors.subtext, fontSize: 16, fontFamily: fonts.regular }}>
              Nema javnih uspomena
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasLiked = item.likedBy?.includes(userId);
          return (
            <View style={{
              backgroundColor: colors.card,
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              {/* User info */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                gap: 10,
              }}>
                {/* Avatar */}
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 16 }}>
                      {item.username?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}

                <View>
                  <Text style={{ color: colors.text, fontSize: 15, fontFamily: fonts.bold }}>
                    {item.username}
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 12, fontFamily: fonts.regular }}>
                    {new Date(item.createdAt).toLocaleDateString('hr-HR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              {/* Slika */}
              <TouchableOpacity onPress={() => router.push(`/memory/${item.id}`)}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: '100%', height: 280 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>

              {/* Sadržaj */}
              <View style={{ padding: 12 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontFamily: fonts.bold, marginBottom: 4 }}>
                  {item.title}
                </Text>

                {item.description ? (
                  <Text style={{ color: colors.subtext, fontFamily: fonts.regular, marginBottom: 12, lineHeight: 20 }}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Separator */}
                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }} />

                {/* Lajk gumb */}
                <TouchableOpacity
                  onPress={() => handleLike(item)}
                  disabled={liking === item.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons
                    name={hasLiked ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={22}
                    color={hasLiked ? colors.primary : colors.subtext}
                  />
                  <Text style={{
                    color: hasLiked ? colors.primary : colors.subtext,
                    fontSize: 15,
                    fontFamily: fonts.bold,
                  }}>
                    {item.likes ?? 0} {item.likes === 1 ? 'like' : 'likes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}