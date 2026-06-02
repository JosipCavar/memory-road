import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { MemoryCardSkeleton } from '../components/SkeletonLoader';

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

interface MemoryGroup {
  label: string;
  data: Memory[];
}

const FILTERS = ['Sve', 'Favoriti', 'Ovaj mjesec', 'Ove godine'];

function groupByMonth(memories: Memory[]): MemoryGroup[] {
  const groups: { [key: string]: Memory[] } = {};
  memories.forEach((memory) => {
    const date = new Date(memory.createdAt);
    const label = date.toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(memory);
  });
  return Object.entries(groups).map(([label, data]) => ({ label, data }));
}

export default function MemoriesListScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filtered, setFiltered] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Sve');
  const { colors, fonts } = useTheme();

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    applyFilter(activeFilter, search);
  }, [search, memories, activeFilter]);

  const applyFilter = (filter: string, searchText: string) => {
    let result = [...memories];
    const now = new Date();

    if (filter === 'Favoriti') {
      result = result.filter((m: any) => m.isFavorite === true);
    } else if (filter === 'Ovaj mjesec') {
      result = result.filter((m) => {
        const d = new Date(m.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (filter === 'Ove godine') {
      result = result.filter((m) => {
        const d = new Date(m.createdAt);
        return d.getFullYear() === now.getFullYear();
      });
    }

    if (searchText.trim() !== '') {
      result = result.filter((m) =>
        m.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFiltered(result);
  };

  const loadMemories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];
      setMemories(data);
      setFiltered(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMemories();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Obriši', 'Jesi li siguran?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'memories', id));
            setMemories(prev => prev.filter(m => m.id !== id));
          } catch (error: any) {
            Alert.alert('Greška', error.message);
          }
        },
      },
    ]);
  };

  const groups = groupByMonth(filtered);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>Sve uspomene</Text>
        </View>
        <View style={{ padding: 16 }}>
          <MemoryCardSkeleton />
          <MemoryCardSkeleton />
          <MemoryCardSkeleton />
          <MemoryCardSkeleton />
          <MemoryCardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: colors.primary, fontFamily: fonts.bold }]}>← Nazad</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>Sve uspomene</Text>
          <Text style={[styles.count, { color: colors.subtext, fontFamily: fonts.regular }]}>{filtered.length} uspomena</Text>

          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, fontFamily: fonts.regular }]}
            placeholder="🔍 Pretraži uspomene..."
            placeholderTextColor={colors.subtext}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: activeFilter === filter ? colors.primary : colors.card,
                    borderColor: activeFilter === filter ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: activeFilter === filter ? '#fff' : colors.subtext, fontFamily: fonts.bold },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: fonts.regular }]}>
                {search ? 'Nema rezultata za pretragu' : 'Nemaš još uspomena'}
              </Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <View>
              <Text style={[styles.groupLabel, { color: colors.primary, fontFamily: fonts.bold }]}>
                📅 {group.label}
              </Text>

              {group.data.map((memory) => (
                <Swipeable
                  key={memory.id}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.deleteAction}
                      onPress={() => handleDelete(memory.id)}
                    >
                      <Text style={styles.deleteActionText}>🗑️</Text>
                      <Text style={[styles.deleteActionText, { fontFamily: fonts.bold }]}>Obriši</Text>
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/memory/${memory.id}`)}
                  >
                    <Image source={{ uri: memory.imageUrl }} style={styles.cardImage} />
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.bold }]}>
                        {memory.isFavorite ? '❤️ ' : ''}{memory.title}
                      </Text>
                      <Text style={[styles.cardDate, { color: colors.subtext, fontFamily: fonts.regular }]}>
                        {new Date(memory.createdAt).toLocaleDateString('hr-HR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text style={[styles.cardLocation, { color: colors.subtext, fontFamily: fonts.regular }]}>
                        📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
                      </Text>
                      {memory.description ? (
                        <Text style={[styles.cardDescription, { color: colors.subtext, fontFamily: fonts.regular }]} numberOfLines={2}>
                          {memory.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          )}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, marginBottom: 4 },
  count: { fontSize: 14, marginBottom: 12 },
  searchInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  filters: { marginBottom: 4 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: { fontSize: 14 },
  list: { padding: 16 },
  groupLabel: {
    fontSize: 16,
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 16 },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
  },
  cardImage: { width: 100, height: 100 },
  cardContent: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  cardDate: { fontSize: 12, marginBottom: 2 },
  cardLocation: { fontSize: 12, marginBottom: 4 },
  cardDescription: { fontSize: 12 },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  deleteActionText: { color: '#fff', fontSize: 12 },
});