import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: string;
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

export default function ShareScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    loadSharedMap();
  }, [userId]);

  const loadSharedMap = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUsername(userDoc.data().username);
      }

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[];
      setMemories(data);
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
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>
          🗺️ {username}-ova Memory Road
        </Text>
        <Text style={[styles.headerSub, { color: colors.subtext }]}>
          {memories.length} uspomena
        </Text>
      </View>

      <MapView
        style={styles.map}
        customMapStyle={isDark ? darkMapStyle : []}
        initialRegion={{
          latitude: memories.length > 0 ? memories[0].latitude : 44.0,
          longitude: memories.length > 0 ? memories[0].longitude : 17.5,
          latitudeDelta: 5,
          longitudeDelta: 5,
        }}
      >
        {memories.map((memory) => (
          <Marker
            key={memory.id}
            coordinate={{
              latitude: memory.latitude,
              longitude: memory.longitude,
            }}
            pinColor={colors.primary}
            title={memory.title}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  headerText: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 14, marginTop: 4 },
  map: { flex: 1 },
});