import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeContext';
import { BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface Memory {
  id: string;
  createdAt: string;
}

export default function StatsChartScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, fonts } = useTheme();

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        createdAt: doc.data().createdAt,
      }));
      setMemories(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    const monthCounts: { [key: string]: number } = {};

    memories.forEach(memory => {
      const date = new Date(memory.createdAt);
      const key = date.toLocaleDateString('hr-HR', { month: 'short', year: '2-digit' });
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });

    const labels = Object.keys(monthCounts).slice(-6);
    const data = labels.map(l => monthCounts[l]);

    return { labels, data };
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const chartData = getChartData();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: colors.primary, fontFamily: fonts.bold }]}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.bold }]}>📊 Statistike</Text>
        <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: fonts.regular }]}>
          Uspomene po mjesecima
        </Text>
      </View>

      {chartData.data.length > 0 ? (
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text, fontFamily: fonts.bold }]}>
            Zadnjih {chartData.labels.length} mjeseci
          </Text>
          <BarChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }],
            }}
            width={width - 64}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: colors.card,
              backgroundGradientFrom: colors.card,
              backgroundGradientTo: colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: () => colors.subtext,
              style: { borderRadius: 16 },
              barPercentage: 0.7,
            }}
            style={{ borderRadius: 12 }}
            showValuesOnTopOfBars
          />
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: fonts.regular }]}>
            Nemaš još dovoljno uspomena za grafikon
          </Text>
        </View>
      )}

      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text, fontFamily: fonts.bold }]}>📈 Ukupno</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.primary, fontFamily: fonts.bold }]}>{memories.length}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: fonts.regular }]}>Uspomena</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.primary, fontFamily: fonts.bold }]}>
              {chartData.labels.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: fonts.regular }]}>Aktivnih mjeseci</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.primary, fontFamily: fonts.bold }]}>
              {chartData.data.length > 0 ? Math.max(...chartData.data) : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtext, fontFamily: fonts.regular }]}>Rekord/mj.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 48 },
  backButton: { fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  chartCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartTitle: { fontSize: 16, marginBottom: 16 },
  statsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 28 },
  statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 16 },
});