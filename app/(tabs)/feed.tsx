import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  increment, } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
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
  const { colors, fonts } = useTheme();
  const [userId, setUserId] = useState('');
  const [liking, setLiking] = useState<string | null>(null);
  const likingRef = useRef(false);
  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
    const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
            setUserId(session.user.id);
            };

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
await loadFeed();
    } catch (error) {
        console.error(error);
    } finally {
        likingRef.current = false;
        setLiking(null);
}
};

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.background,
    }}
  >
    <FlatList
      data={memories}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View
        style={{
            backgroundColor: colors.card,
            margin: 12,
            borderRadius: 16,
            overflow: 'hidden',
        }}
        >
          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              {item.username}
            </Text>

            <Text
              style={{
                color: colors.subtext,
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {new Date(item.createdAt).toLocaleDateString('hr-HR')}
            </Text>
          </View>

            <TouchableOpacity
        onPress={() => router.push(`/memory/${item.id}`)}
        >
        <Image
            source={{ uri: item.imageUrl }}
            style={{
            width: '100%',
            height: 250,
            }}
        />
        </TouchableOpacity>

          <View style={{ padding: 12 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              {item.title}
            </Text>

            <Text
              style={{
                color: colors.text,
                marginBottom: 12,
              }}
            >
              {item.description}
            </Text>

            <TouchableOpacity
                onPress={() => handleLike(item)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                }}
                >
                <Ionicons
                    name={
                    item.likedBy?.includes(userId)
                        ? 'thumbs-up'
                        : 'thumbs-up-outline'
                    }
                    size={22}
                    color="white"
                />

                <Text
                    style={{
                    color: colors.text,
                    fontSize: 16,
                    }}
                >
                    {item.likes}
                </Text>
                </TouchableOpacity>
          </View>
        </View>
      )}
    />
  </View>
);}