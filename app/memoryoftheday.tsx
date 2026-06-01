import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
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
}

export default function MemoryOfTheDayScreen() {
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

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
      const memories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];

      if (memories.length === 0) {
        setLoading(false);
        return;
      }

      // Odaberi random uspomenu baziranu na današnjem datumu
      const today = new Date().toDateString();
      const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = seed % memories.length;
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
        <Text style={[styles.emptyText, { color: colors.subtext }]}>
          Nemaš još uspomena 📭
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/add-memory')}
        >
          <Text style={styles.buttonText}>Dodaj prvu uspomenu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { color: colors.primary }]}>← Nazad</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>📅 Uspomena dana</Text>
        <Text style={[styles.headerDate, { color: colors.subtext }]}>
          {new Date().toLocaleDateString('hr-HR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      <TouchableOpacity onPress={() => router.push(`/memory/${memory.id}`)}>
        <Image source={{ uri: memory.imageUrl }} style={styles.image} resizeMode="cover" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{memory.title}</Text>

        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.subtext }]}>
            📅 {new Date(memory.createdAt).toLocaleDateString('hr-HR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.subtext }]}>
            📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
          </Text>
        </View>

        {memory.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.descriptionLabel, { color: colors.primary }]}>Opis</Text>
            <Text style={[styles.description, { color: colors.text }]}>{memory.description}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/memory/${memory.id}`)}
        >
          <Text style={styles.buttonText}>Otvori uspomenu →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, marginBottom: 24 },
  backButton: { marginTop: 48, marginLeft: 24, marginBottom: 8 },
  backButtonText: { fontSize: 16, fontWeight: 'bold' },
  header: { padding: 24, paddingTop: 8 },
  headerLabel: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  headerDate: { fontSize: 14 },
  image: { width, height: 280 },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 16 },
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
  descriptionLabel: { fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  description: { fontSize: 16, lineHeight: 24 },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});