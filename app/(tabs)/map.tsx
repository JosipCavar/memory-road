import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: string;
}

export default function MapScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'memories'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];
      setMemories(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 44.0,
          longitude: 17.5,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
        showsUserLocation
      >
        {memories.map((memory) => (
          <Marker
            key={memory.id}
            coordinate={{
              latitude: memory.latitude,
              longitude: memory.longitude,
            }}
            pinColor="#4CAF50"
            onPress={() => setSelected(memory)}
          />
        ))}
      </MapView>

      {/* Popup modal */}
      {selected && (
        <View style={styles.popup}>
          {selected.imageUrl ? (
            <Image source={{ uri: selected.imageUrl }} style={styles.popupImage} />
          ) : null}
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>{selected.title}</Text>
            <Text style={styles.popupDate}>
              {new Date(selected.createdAt).toLocaleDateString('hr-HR')}
            </Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => {
                  setSelected(null);
                  router.push(`/memory/${selected.id}`);
                }}
              >
                <Text style={styles.openButtonText}>Otvori →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  popup: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 8,
  },
  popupImage: {
    width: '100%',
    height: 150,
  },
  popupContent: {
    padding: 16,
  },
  popupTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  popupDate: { color: '#888', fontSize: 13, marginBottom: 12 },
  popupButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  openButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: {
    padding: 10,
  },
  closeButtonText: { color: '#888', fontSize: 18 },
});