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
}

interface MemoryGroup {
  label: string;
  data: Memory[];
}

const FILTERS = ['Sve', 'Ovaj mjesec', 'Ove godine'];

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
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Sve');
  const { colors } = useTheme();

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    applyFilter(activeFilter, search);
  }, [search, memories, activeFilter]);

  const applyFilter = (filter: string, searchText: string) => {
    let result = [...memories];
    const now = new Date();

    if (filter === 'Ovaj mjesec') {
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

  const groups = groupByMonth(filtered);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Sve uspomene</Text>
        <Text style={[styles.count, { color: colors.subtext }]}>{filtered.length} uspomena</Text>

        {/* Search bar */}
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="🔍 Pretraži uspomene..."
          placeholderTextColor={colors.subtext}
          value={search}
          onChangeText={setSearch}
        />

        {/* Filter gumbi */}
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
                  { color: activeFilter === filter ? '#fff' : colors.subtext },
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista grupirana po mjesecima */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {search ? 'Nema rezultata za pretragu' : 'Nemaš još uspomena'}
            </Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <View>
            {/* Mjesec/godina header */}
            <Text style={[styles.groupLabel, { color: colors.primary }]}>
              📅 {group.label}
            </Text>

            {group.data.map((memory) => (
              <TouchableOpacity
                key={memory.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/memory/${memory.id}`)}
              >
                <Image source={{ uri: memory.imageUrl }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{memory.title}</Text>
                  <Text style={[styles.cardDate, { color: colors.subtext }]}>
                    {new Date(memory.createdAt).toLocaleDateString('hr-HR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={[styles.cardLocation, { color: colors.subtext }]}>
                    📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
                  </Text>
                  {memory.description ? (
                    <Text style={[styles.cardDescription, { color: colors.subtext }]} numberOfLines={2}>
                      {memory.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  backButton: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
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
  filterText: { fontSize: 14, fontWeight: 'bold' },
  list: { padding: 16 },
  groupLabel: {
    fontSize: 16,
    fontWeight: 'bold',
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
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardDate: { fontSize: 12, marginBottom: 2 },
  cardLocation: { fontSize: 12, marginBottom: 4 },
  cardDescription: { fontSize: 12 },
});