import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  imageUrls?: string[];
  createdAt: string;
  userId: string;
}

export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadMemory();
    }, [id])
  );

  const loadMemory = async () => {
    try {
      const docRef = doc(db, 'memories', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMemory({ id: docSnap.id, ...docSnap.data() } as Memory);
      }
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Obriši', 'Jesi li siguran da želiš obrisati ovu uspomenu?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'memories', id));
            router.back();
          } catch (error: any) {
            Alert.alert('Greška', error.message);
          }
        },
      },
    ]);
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
        <Text style={[styles.errorText, { color: colors.text }]}>Uspomena nije pronađena</Text>
      </View>
    );
  }

  // Kompatibilnost sa starim i novim formatom
  const allImages = memory.imageUrls ?? [memory.imageUrl];

  return (
    <>
      <StatusBar hidden={!!fullscreenImage} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Horizontalni scroll slika */}
        <FlatList
          horizontal
          data={allImages}
          keyExtractor={(_, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setFullscreenImage(item)}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
              <View style={styles.zoomHint}>
                <Text style={styles.zoomHintText}>🔍 Klikni za prikaz</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Indikator slika */}
        {allImages.length > 1 && (
          <View style={styles.indicator}>
            {allImages.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: colors.primary }]}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Nazad</Text>
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

          {allImages.length > 1 && (
            <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.subtext }]}>
                🖼️ {allImages.length} slika
              </Text>
            </View>
          )}

          {memory.description ? (
            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.descriptionLabel, { color: colors.primary }]}>Opis</Text>
              <Text style={[styles.description, { color: colors.text }]}>{memory.description}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push(`/memory/edit/${memory.id}`)}
          >
            <Text style={[styles.editButtonText, { color: colors.primary }]}>✏️ Uredi uspomenu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️ Obriši uspomenu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fullscreen modal */}
      <Modal
        visible={!!fullscreenImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setFullscreenImage(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  image: { width, height: 300 },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomHintText: { color: '#fff', fontSize: 12 },
  indicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: { color: '#fff', fontSize: 16 },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
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
  editButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  editButtonText: { fontSize: 16, fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  deleteButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 18 },
  fullscreenImage: { width, height },
});