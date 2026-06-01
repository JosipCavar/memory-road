import { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image, Animated } from 'react-native';
import MapView, { Marker, Heatmap } from 'react-native-maps';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { cacheMemories, getCachedMemories } from '../../lib/offlineStorage';
import { useNetworkStatus } from '../../lib/useNetworkStatus';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { BlurView } from 'expo-blur';
import { useShake } from '../../lib/useShake';

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
  const [quickActionsGroup, setQuickActionsGroup] = useState<MemoryGroup | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const { isDark, colors } = useTheme();
  const isOnline = useNetworkStatus();

  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastShakeTime = useRef(0);

  const openRandomMemory = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTime.current < 3000) return;
    lastShakeTime.current = now;

    if (memories.length === 0) return;
    const random = memories[Math.floor(Math.random() * memories.length)];
    hapticMedium();
    router.push(`/memory/${random.id}`);
  }, [memories]);

  useShake(openRandomMemory);

  const showPopup = (group: MemoryGroup) => {
    translateY.setValue(300);
    opacity.setValue(0);
    hapticLight();
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

  const showQuickActions = (group: MemoryGroup) => {
    hapticMedium();
    setQuickActionsGroup(group);
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
        {!showHeatmap && groups.map((group, index) => (
          <Marker
            key={`${index}-${group.memories.some(m => m.isFavorite)}`}
            coordinate={{
              latitude: group.latitude,
              longitude: group.longitude,
            }}
            onPress={() => showPopup(group)}
            onLongPress={() => {
              console.log('long press!');
              showQuickActions(group);
            }}
            pinColor={group.memories.some(m => m.isFavorite) ? '#ff4444' : '#4CAF50'}
            tracksViewChanges={false}
          />
        ))}

        {showHeatmap && memories.length > 0 && (
          <Heatmap
            points={memories.map(m => ({
              latitude: m.latitude,
              longitude: m.longitude,
              weight: m.isFavorite ? 2 : 1,
            }))}
            radius={50}
            opacity={0.8}
            gradient={{
              colors: ['#00ff00', '#ffff00', '#ff0000'],
              startPoints: [0.1, 0.5, 1.0],
              colorMapSize: 256,
            }}
          />
        )}
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

      {/* Heatmap gumb */}
      <TouchableOpacity
        style={[styles.heatmapButton, { backgroundColor: showHeatmap ? colors.primary : 'rgba(0,0,0,0.6)' }]}
        onPress={() => {
          hapticLight();
          setShowHeatmap(!showHeatmap);
        }}
      >
        <Text style={styles.heatmapButtonText}>🔥</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      {quickActionsGroup && (
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.quickActions, { borderColor: colors.border }]}
        >
          <Text style={[styles.quickActionsTitle, { color: colors.text }]}>
            {quickActionsGroup.memories[0].title}
          </Text>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card }]}
            onPress={() => {
              setQuickActionsGroup(null);
              router.push(`/memory/${quickActionsGroup.memories[0].id}`);
            }}
          >
            <Text style={[styles.quickActionText, { color: colors.text }]}>👁️ Otvori uspomenu</Text>
          </TouchableOpacity>
          {quickActionsGroup.memories.length > 1 && (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card }]}
              onPress={() => {
                setQuickActionsGroup(null);
                showPopup(quickActionsGroup);
              }}
            >
              <Text style={[styles.quickActionText, { color: colors.text }]}>📋 Prikaži sve ({quickActionsGroup.memories.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.card }]}
            onPress={() => setQuickActionsGroup(null)}
          >
            <Text style={[styles.quickActionText, { color: '#ff4444' }]}>✕ Zatvori</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {selectedGroup && currentMemory && (
        <Animated.View
          style={[
            styles.popupWrapper,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.popup, { borderColor: colors.border }]}
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
          </BlurView>
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
  heatmapButton: {
    position: 'absolute',
    top: 100,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heatmapButtonText: { fontSize: 22 },
  quickActions: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 16,
  },
  quickActionsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  quickAction: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickActionText: { fontSize: 14, fontWeight: 'bold' },
  popupWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    elevation: 8,
  },
  popup: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  popupImage: { width: '100%', height: 150 },
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