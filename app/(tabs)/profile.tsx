import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';

interface UserProfile {
  username: string;
  email: string;
  shareToken: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoriesCount, setMemoriesCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userDoc = await getDoc(doc(db, 'users', session.user.id));
      if (userDoc.exists()) {
        setProfile(userDoc.data() as UserProfile);
      }

      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id)
      );
      const snapshot = await getCountFromServer(q);
      setMemoriesCount(snapshot.data().count);
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    const shareUrl = `memory-road://share/${profile.shareToken}`;
    await Share.share({
      message: `Pogledaj moju Memory Road kartu! 🗺️\n${shareUrl}`,
      title: 'Memory Road',
    });
  };

  const handleLogout = async () => {
    Alert.alert('Odjava', 'Jesi li siguran?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Odjavi se',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.username?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.username}>{profile?.username}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{memoriesCount}</Text>
          <Text style={styles.statLabel}>Uspomena</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>🔗 Dijeli svoju kartu</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Odjavi se</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 24, marginTop: 48 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  email: { fontSize: 14, color: '#888' },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 36, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 14, color: '#888', marginTop: 4 },
  shareButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  shareButtonText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
});