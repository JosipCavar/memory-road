import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
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

interface MemoryGroup {
  latitude: number;
  longitude: number;
  memories: Memory[];
}

function groupMemories(memories: Memory[]): MemoryGroup[] {
  const groups: MemoryGroup[] = [];
  memories.forEach((memory) => {
    const existing = groups.find(
      (g) =>
        Math.abs(g.latitude - memory.latitude) < 0.0001 &&
        Math.abs(g.longitude - memory.longitude) < 0.0001
    );
    if (existing) {
      existing.memories.push(memory);
    } else {
      groups.push({
        latitude: memory.latitude,
        longitude: memory.longitude,
        memories: [memory],
      });
    }
  });
  return groups;
}

export default function MapScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MemoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const groups = groupMemories(memories);

  const handleMarkerPress = (group: MemoryGroup) => {
    setSelectedGroup(group);
    setCurrentIndex(0);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (selectedGroup && currentIndex < selectedGroup.memories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const currentMemory = selectedGroup?.memories[currentIndex];

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
        {groups.map((group, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: group.latitude,
              longitude: group.longitude,
            }}
            onPress={() => handleMarkerPress(group)}
            pinColor="#4CAF50"
          >
          </Marker>
        ))}
      </MapView>

      {selectedGroup && currentMemory && (
        <View style={styles.popup}>
          <Image source={{ uri: currentMemory.imageUrl }} style={styles.popupImage} />
          
          {/* Indikator stranica */}
          {selectedGroup.memories.length > 1 && (
            <View style={styles.indicator}>
              {selectedGroup.memories.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>{currentMemory.title}</Text>
            <Text style={styles.popupDate}>
              {new Date(currentMemory.createdAt).toLocaleDateString('hr-HR')}
            </Text>

            <View style={styles.popupButtons}>
              {/* Navigacija lijevo/desno */}
              {selectedGroup.memories.length > 1 && (
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                    onPress={handlePrev}
                    disabled={currentIndex === 0}
                  >
                    <Text style={styles.navButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.navCount}>
                    {currentIndex + 1} / {selectedGroup.memories.length}
                  </Text>
                  <TouchableOpacity
                    style={[styles.navButton, currentIndex === selectedGroup.memories.length - 1 && styles.navButtonDisabled]}
                    onPress={handleNext}
                    disabled={currentIndex === selectedGroup.memories.length - 1}
                  >
                    <Text style={styles.navButtonText}>→</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => {
                    setSelectedGroup(null);
                    router.push(`/memory/${currentMemory.id}`);
                  }}
                >
                  <Text style={styles.openButtonText}>Otvori →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedGroup(null)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
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
  indicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: { backgroundColor: '#4CAF50' },
  dotInactive: { backgroundColor: '#444' },
  popupContent: {
    padding: 16,
  },
  popupTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  popupDate: { color: '#888', fontSize: 13, marginBottom: 12 },
  popupButtons: { gap: 8 },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  navButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonDisabled: { opacity: 0.3 },
  navButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  navCount: { color: '#888', marginHorizontal: 16, fontSize: 14 },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: { padding: 10 },
  closeButtonText: { color: '#888', fontSize: 18 },
});