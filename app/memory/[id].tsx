import { useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: string;
  userId: string;
}

export default function MemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  useEffect(() => {
    loadMemory();
  }, [id]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!memory) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Uspomena nije pronađena</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar hidden={imageFullscreen} />
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setImageFullscreen(true)}>
          <Image source={{ uri: memory.imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.zoomHint}>
            <Text style={styles.zoomHintText}>🔍 Klikni za prikaz</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Nazad</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{memory.title}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              📅 {new Date(memory.createdAt).toLocaleDateString('hr-HR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
            </Text>
          </View>

          {memory.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>Opis</Text>
              <Text style={styles.description}>{memory.description}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑️ Obriši uspomenu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={imageFullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImageFullscreen(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setImageFullscreen(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: memory.imageUrl }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  errorText: { color: '#fff', fontSize: 16 },
  image: { width: '100%', height: 300 },
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  infoRow: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: { color: '#888', fontSize: 14 },
  descriptionCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  descriptionLabel: { color: '#4CAF50', fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  description: { color: '#fff', fontSize: 16, lineHeight: 24 },
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
  fullscreenImage: {
    width,
    height,
  },
});