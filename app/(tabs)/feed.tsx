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
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Memory {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  username: string;
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
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];

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
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 }}>
            <Text style={{ color: colors.subtext, fontSize: 16, fontFamily: fonts.regular }}>
              Nema javnih uspomena
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: colors.card,
            margin: 12,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ padding: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.bold }}>
                {item.username}
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 2, fontFamily: fonts.regular }}>
                {new Date(item.createdAt).toLocaleDateString('hr-HR')}
              </Text>
            </View>

            <TouchableOpacity onPress={() => router.push(`/memory/${item.id}`)}>
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: '100%', height: 250 }}
              />
            </TouchableOpacity>

            <View style={{ padding: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, marginBottom: 4, fontFamily: fonts.bold }}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={{ color: colors.subtext, marginBottom: 12, fontFamily: fonts.regular }}>
                  {item.description}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={() => handleLike(item)}
                disabled={liking === item.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons
                  name={item.likedBy?.includes(userId) ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={22}
                  color={item.likedBy?.includes(userId) ? colors.primary : colors.subtext}
                />
                <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.regular }}>
                  {item.likes ?? 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}