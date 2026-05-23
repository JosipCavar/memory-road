import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { useLocalSearchParams } from 'expo-router';

interface Memory {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  createdAt: string;
}

export default function ShareScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedMap();
  }, [userId]);

  const loadSharedMap = async () => {
    try {
      // Dohvati korisničko ime
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUsername(userDoc.data().username);
      }

      // Dohvati uspomene
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🗺️ {username}-ova Memory Road</Text>
        <Text style={styles.headerSub}>{memories.length} uspomena</Text>
      </View>

      <MapView
        style={styles.map}
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
            pinColor="#4CAF50"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{memory.title}</Text>
                <Text style={styles.calloutDate}>
                  {new Date(memory.createdAt).toLocaleDateString('hr-HR')}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#888', fontSize: 14, marginTop: 4 },
  map: { flex: 1 },
  callout: { padding: 8, minWidth: 150 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  calloutDate: { color: '#666', fontSize: 12 },
});