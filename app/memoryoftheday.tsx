import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';

const { width } = Dimensions.get('window');

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

function getDailyIndex(total: number): number {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % total;
}

export default function MemoryOfTheDayScreen() {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors, fonts } = useTheme();

  useEffect(() => {
    loadMemoryOfTheDay();
  }, []);

  const loadMemoryOfTheDay = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id)
      );
      const snapshot = await getDocs(q);
      const memories = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Memory[];

      if (memories.length === 0) return;

      const index = getDailyIndex(memories.length);
      setMemory(memories[index]);
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

  if (!memory) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: fonts.regular }]}>
          Nemaš još uspomena!
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary, fontFamily: fonts.bold }]}>← Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { fontFamily: fonts.bold }]}>← Nazad</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.primary, fontFamily: fonts.bold }]}>📅 Uspomena dana</Text>
        <Text style={[styles.headerDate, { color: colors.subtext, fontFamily: fonts.regular }]}>
          {new Date().toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <Image source={{ uri: memory.imageUrl }} style={styles.image} resizeMode="cover" />

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>
          {memory.isFavorite ? '❤️ ' : ''}{memory.title}
        </Text>

        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.subtext, fontFamily: fonts.regular }]}>
            📅 {new Date(memory.createdAt).toLocaleDateString('hr-HR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.subtext, fontFamily: fonts.regular }]}>
            📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
          </Text>
        </View>

        {memory.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descriptionLabel, { color: colors.primary, fontFamily: fonts.bold }]}>Opis</Text>
            <Text style={[styles.description, { color: colors.text, fontFamily: fonts.regular }]}>{memory.description}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/memory/${memory.id}`)}
        >
          <Text style={[styles.openButtonText, { fontFamily: fonts.bold }]}>Otvori uspomenu →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, marginBottom: 16 },
  backLink: { fontSize: 16 },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  backButtonText: { color: '#fff', fontSize: 16 },
  header: { padding: 24, paddingTop: 48, alignItems: 'center' },
  headerLabel: { fontSize: 18, marginBottom: 4 },
  headerDate: { fontSize: 14 },
  image: { width, height: 300 },
  content: { padding: 24 },
  title: { fontSize: 28, marginBottom: 16 },
  infoRow: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  infoText: { fontSize: 14 },
  descriptionCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  descriptionLabel: { fontSize: 12, marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 24 },
  openButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  openButtonText: { color: '#fff', fontSize: 16 },
});