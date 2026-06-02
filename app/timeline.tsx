import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: string;
  isFavorite?: boolean;
}

export default function TimelineScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, fonts } = useTheme();

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];
      setMemories(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          <Text style={[styles.backButton, { color: colors.primary, fontFamily: fonts.bold }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>🗓️ Timeline</Text>
        <Text style={[styles.count, { color: colors.subtext, fontFamily: fonts.regular }]}>{memories.length} uspomena</Text>
      </View>

      <FlatList
        data={memories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: fonts.regular }]}>Nemaš još uspomena</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, {
                backgroundColor: item.isFavorite ? '#ff4444' : colors.primary
              }]} />
              {index < memories.length - 1 && (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              )}
            </View>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/memory/${item.id}`)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.bold }]}>
                  {item.isFavorite ? '❤️ ' : ''}{item.title}
                </Text>
                <Text style={[styles.cardDate, { color: colors.subtext, fontFamily: fonts.regular }]}>
                  {new Date(item.createdAt).toLocaleDateString('hr-HR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {item.description ? (
                  <Text style={[styles.cardDescription, { color: colors.subtext, fontFamily: fonts.regular }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, marginBottom: 4 },
  count: { fontSize: 14 },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 16 },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 16,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImage: { width: '100%', height: 140 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardDate: { fontSize: 12, marginBottom: 4 },
  cardDescription: { fontSize: 12 },
});