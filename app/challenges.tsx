import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { CHALLENGES, getWeekStart, getMonthStart } from '../lib/challenges';
import { getLocationName } from '../lib/geocoding';

export default function ChallengesScreen() {
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const now = new Date();
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      // Dohvati sve uspomene
      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id)
      );
      const snapshot = await getDocs(q);
      const memories = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Tjedne uspomene
      const weeklyMemories = memories.filter(m => new Date(m.createdAt) >= weekStart);
      // Mjesečne uspomene
      const monthlyMemories = memories.filter(m => new Date(m.createdAt) >= monthStart);

      // Tjedni favoriti
      const weeklyFavorites = weeklyMemories.filter(m => m.isFavorite === true);
      // Mjesečni favoriti
      const monthlyFavorites = monthlyMemories.filter(m => m.isFavorite === true);

      // Mjesečne države
      const countryNames = await Promise.all(
        monthlyMemories.map(m => getLocationName(m.latitude, m.longitude))
      );
      const uniqueCountries = new Set(countryNames.filter(c => c !== 'Nepoznata država' && c !== 'Nepoznata lokacija' && c !== ''));

      setProgress({
        weekly_memories: weeklyMemories.length,
        monthly_memories: monthlyMemories.length,
        weekly_favorites: weeklyFavorites.length,
        monthly_favorites: monthlyFavorites.length,
        monthly_countries: uniqueCountries.size,
      });
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🎯 Izazovi</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Tjedni i mjesečni izazovi
        </Text>
      </View>

      <FlatList
        data={CHALLENGES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const current = progress[item.id] ?? 0;
          const isCompleted = current >= item.target;
          const percentage = Math.min((current / item.target) * 100, 100);

          return (
            <View style={[
              styles.challengeCard,
              {
                backgroundColor: colors.card,
                borderColor: isCompleted ? colors.primary : colors.border,
              }
            ]}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeIcon}>{item.icon}</Text>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.challengeDescription, { color: colors.subtext }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.challengePeriod, { color: colors.primary }]}>
                    {item.period === 'weekly' ? '📅 Tjedni' : '📆 Mjesečni'}
                  </Text>
                </View>
                {isCompleted && <Text style={styles.completedBadge}>✅</Text>}
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: isCompleted ? colors.primary : '#888',
                        width: `${percentage}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.subtext }]}>
                  {current}/{item.target}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  list: { padding: 16 },
  challengeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeIcon: { fontSize: 32, marginRight: 12 },
  challengeInfo: { flex: 1 },
  challengeTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  challengeDescription: { fontSize: 13, marginBottom: 4 },
  challengePeriod: { fontSize: 11, fontWeight: 'bold' },
  completedBadge: { fontSize: 24 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: { fontSize: 12, minWidth: 30, textAlign: 'right' },
});