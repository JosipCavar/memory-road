import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image, Animated } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { cacheMemories, getCachedMemories } from '../../lib/offlineStorage';
import { useNetworkStatus } from '../../lib/useNetworkStatus';

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
  latitude: number;
  longitude: number;
  memories: Memory[];
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
];

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
  const { isDark, colors } = useTheme();
  const isOnline = useNetworkStatus();

  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const showPopup = (group: MemoryGroup) => {
    translateY.setValue(300);
    opacity.setValue(0);
    setSelectedGroup(group);
    setCurrentIndex(0);
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 15, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 50);
  };

  const hidePopup = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setSelectedGroup(null));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    if (!isOnline) {
      getCachedMemories(userId).then((cached) => {
        setMemories(cached);
        setLoading(false);
      });
      return;
    }

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
      cacheMemories(userId, data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, isOnline]);

  const groups = groupMemories(memories);

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentMemory = selectedGroup?.memories[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📵 Offline mode — prikazuju se cackirani podaci</Text>
        </View>
      )}

      <MapView
        style={styles.map}
        customMapStyle={isDark ? darkMapStyle : []}
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
            key={`${index}-${group.memories.some(m => m.isFavorite)}`}
            coordinate={{
              latitude: group.latitude,
              longitude: group.longitude,
            }}
            onPress={() => showPopup(group)}
            pinColor={group.memories.some(m => m.isFavorite) ? '#ff4444' : '#4CAF50'}
          />
        ))}
      </MapView>

      {/* Memory of the day gumb */}
      <TouchableOpacity
        style={styles.motdButton}
        onPress={() => router.push('/memoryoftheday')}
      >
        <Text style={styles.motdButtonText}>📅</Text>
      </TouchableOpacity>

      {/* Timeline gumb */}
      <TouchableOpacity
        style={styles.timelineButton}
        onPress={() => router.push('/timeline')}
      >
        <Text style={styles.timelineButtonText}>🗓️</Text>
      </TouchableOpacity>

      {selectedGroup && currentMemory && (
        <Animated.View
          style={[
            styles.popup,
            { backgroundColor: colors.card, borderColor: colors.border },
            { transform: [{ translateY }], opacity },
          ]}
        >
          <Image source={{ uri: currentMemory.imageUrl }} style={styles.popupImage} />

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
            <Text style={[styles.popupTitle, { color: colors.text }]}>
              {currentMemory.isFavorite ? '❤️ ' : ''}{currentMemory.title}
            </Text>
            <Text style={[styles.popupDate, { color: colors.subtext }]}>
              {new Date(currentMemory.createdAt).toLocaleDateString('hr-HR')}
            </Text>

            <View style={styles.popupButtons}>
              {selectedGroup.memories.length > 1 && (
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                    onPress={handlePrev}
                    disabled={currentIndex === 0}
                  >
                    <Text style={styles.navButtonText}>←</Text>
                  </TouchableOpacity>
                  <Text style={[styles.navCount, { color: colors.subtext }]}>
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
                  style={[styles.openButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    hidePopup();
                    router.push(`/memory/${currentMemory.id}`);
                  }}
                >
                  <Text style={styles.openButtonText}>Otvori →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={hidePopup}
                >
                  <Text style={[styles.closeButtonText, { color: colors.subtext }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    backgroundColor: '#ff9800',
    padding: 8,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  motdButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  motdButtonText: { fontSize: 22 },
  timelineButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timelineButtonText: { fontSize: 22 },
  popup: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
  },
  popupImage: { width: '100%', height: 150, borderRadius: 16 },
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
  popupContent: { padding: 16 },
  popupTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  popupDate: { fontSize: 13, marginBottom: 12 },
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
  navCount: { marginHorizontal: 16, fontSize: 14 },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openButtonText: { color: '#fff', fontWeight: 'bold' },
  closeButton: { padding: 10 },
  closeButtonText: { fontSize: 18 },
});