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
  Switch,
  Modal,
  Image,
} from 'react-native';
import { doc, getDoc, collection, query, where, getCountFromServer, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  username: string;
  email: string;
  shareToken: string;
  createdAt: string;
  avatarUrl?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [uniqueLocations, setUniqueLocations] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();

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

      // Dohvati broj uspomena
      const q = query(
        collection(db, 'memories'),
        where('userId', '==', session.user.id)
      );
      const snapshot = await getCountFromServer(q);
      setMemoriesCount(snapshot.data().count);

      // Dohvati jedinstvene lokacije
      const memoriesSnap = await getDocs(q);
      const memoriesData = memoriesSnap.docs.map(d => d.data());
      const locations = new Set(
        memoriesData.map(m =>
          `${Math.round(m.latitude * 10) / 10},${Math.round(m.longitude * 10) / 10}`
        )
      );
      setUniqueLocations(locations.size);

    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Greška', 'Potrebna je dozvola za galeriju');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileName = `${session.user.id}/avatar.jpg`;

      await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      await updateDoc(doc(db, 'users', session.user.id), { avatarUrl });
      setProfile((prev) => prev ? { ...prev, avatarUrl } : prev);
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setUploadingAvatar(false);
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const shareUrl = `memory-road://share/${profile?.shareToken}`;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Profil</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            {profile?.avatarUrl ? (
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                {uploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditText}>✏️</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.avatarText}>
                      {profile?.username?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                    <View style={styles.avatarEditBadge}>
                      <Text style={styles.avatarEditText}>✏️</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.username, { color: colors.text }]}>{profile?.username}</Text>
          <Text style={[styles.email, { color: colors.subtext }]}>{profile?.email}</Text>
        </View>

        {/* Statistike */}
        <TouchableOpacity
          style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/memories-list')}
        >
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{memoriesCount}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Uspomena</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{uniqueLocations}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Lokacija</Text>
            </View>
          </View>
          <Text style={[styles.statsHint, { color: colors.subtext }]}>Pritisni za sve uspomene →</Text>
        </TouchableOpacity>

        {/* Dark/Light mode */}
        <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.themeText, { color: colors.text }]}>
            {isDark ? '🌙 Dark mode' : '☀️ Light mode'}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor='#fff'
          />
        </View>

        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={() => setShowQR(true)}
        >
          <Text style={[styles.shareButtonText, { color: colors.primary }]}>
            📲 Prikaži QR kod
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
          onPress={handleShare}
        >
          <Text style={[styles.shareButtonText, { color: colors.primary }]}>
            🔗 Dijeli svoju kartu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Odjavi se</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* QR Modal */}
      <Modal
        visible={showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              🗺️ Moja Memory Road
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.subtext }]}>
              Skeniraj QR kod za pregled karte
            </Text>

            <View style={styles.qrContainer}>
              <QRCode
                value={shareUrl}
                size={200}
                color={isDark ? '#fff' : '#000'}
                backgroundColor={isDark ? '#1a1a1a' : '#fff'}
              />
            </View>

            <Text style={[styles.modalUrl, { color: colors.subtext }]} numberOfLines={1}>
              {shareUrl}
            </Text>

            <TouchableOpacity
              style={[styles.modalShareButton, { backgroundColor: colors.primary }]}
              onPress={handleShare}
            >
              <Text style={styles.modalShareButtonText}>🔗 Dijeli link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowQR(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.subtext }]}>Zatvori</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, marginTop: 48 },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditText: { fontSize: 12 },
  username: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 14 },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 40 },
  statNumber: { fontSize: 36, fontWeight: 'bold' },
  statLabel: { fontSize: 14, marginTop: 4 },
  statsHint: { fontSize: 12, textAlign: 'center' },
  themeCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  themeText: { fontSize: 16, fontWeight: 'bold' },
  shareButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  shareButtonText: { fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  qrContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  modalUrl: { fontSize: 11, marginBottom: 16, textAlign: 'center' },
  modalShareButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalShareButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalClose: { padding: 8 },
  modalCloseText: { fontSize: 14 },
});