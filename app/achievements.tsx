import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  getLockedAchievements,
  AchievementStats,
} from '../lib/achievements';
import { getLocationName } from '../lib/geocoding';

const { width } = Dimensions.get('window');

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function ConfettiPiece({ index }: { index: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const x = useRef(new Animated.Value(Math.random() * width)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const confettiColors = ['#4CAF50', '#ff4444', '#2196F3', '#FF9800', '#9C27B0', '#FFEB3B'];
  const color = confettiColors[index % confettiColors.length];
  const size = 8 + Math.random() * 12;
  const isSquare = Math.random() > 0.5;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: 800,
        duration: 2000 + Math.random() * 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: isSquare ? 2 : size / 2,
        backgroundColor: color,
        transform: [{ translateY: y }, { translateX: x }],
        opacity,
      }}
    />
  );
}

export default function AchievementsScreen() {
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const { colors, fonts } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const memories = snapshot.docs.map(d => d.data());

      const memoriesCount = memories.length;
      const favoritesCount = memories.filter(m => m.isFavorite === true).length;

      let totalKm = 0;
      for (let i = 1; i < memories.length; i++) {
        totalKm += haversineDistance(
          memories[i - 1].latitude,
          memories[i - 1].longitude,
          memories[i].latitude,
          memories[i].longitude
        );
      }

      const countryNames = await Promise.all(
        memories.map(m => getLocationName(m.latitude, m.longitude))
      );
      const uniqueCountries = new Set(countryNames.filter(c => c !== 'Nepoznata država' && c !== 'Nepoznata lokacija' && c !== ''));

      const newStats: AchievementStats = {
        memoriesCount,
        favoritesCount,
        totalKm: Math.round(totalKm),
        countriesCount: uniqueCountries.size,
      };

      setStats(newStats);

      const newUnlocked = getUnlockedAchievements(newStats).length;
      if (newUnlocked > 0) {
        setShowConfetti(true);
      }

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

  const unlocked = stats ? getUnlockedAchievements(stats) : [];
  const locked = stats ? getLockedAchievements(stats) : ACHIEVEMENTS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary, fontFamily: fonts.bold }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>🏆 Dostignuća</Text>
        <Text style={[styles.count, { color: colors.subtext, fontFamily: fonts.regular }]}>
          {unlocked.length}/{ACHIEVEMENTS.length} otključano
        </Text>
      </View>

      <View style={[styles.progressContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.subtext, fontFamily: fonts.regular }]}>
          {Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}% završeno
        </Text>
      </View>

      <FlatList
        data={[...unlocked, ...locked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isUnlocked = unlocked.some(a => a.id === item.id);
          return (
            <View style={[
              styles.achievementCard,
              {
                backgroundColor: colors.card,
                borderColor: isUnlocked ? colors.primary : colors.border,
                opacity: isUnlocked ? 1 : 0.5,
              }
            ]}>
              <Text style={styles.achievementIcon}>{item.icon}</Text>
              <View style={styles.achievementContent}>
                <Text style={[styles.achievementTitle, { color: colors.text, fontFamily: fonts.bold }]}>
                  {item.title}
                </Text>
                <Text style={[styles.achievementDescription, { color: colors.subtext, fontFamily: fonts.regular }]}>
                  {item.description}
                </Text>
              </View>
              {isUnlocked && (
                <Text style={styles.achievementCheck}>✅</Text>
              )}
            </View>
          );
        }}
      />

      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[...Array(50)].map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, marginBottom: 4 },
  count: { fontSize: 14 },
  progressContainer: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, textAlign: 'center' },
  list: { padding: 16 },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  achievementIcon: { fontSize: 32, marginRight: 12 },
  achievementContent: { flex: 1 },
  achievementTitle: { fontSize: 16, marginBottom: 4 },
  achievementDescription: { fontSize: 13 },
  achievementCheck: { fontSize: 20 },
});