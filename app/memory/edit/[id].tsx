import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firestore';
import { useTheme } from '../../../lib/ThemeContext';

export default function EditMemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    loadMemory();
  }, [id]);

  const loadMemory = async () => {
    try {
      const docRef = doc(db, 'memories', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title);
        setDescription(data.description ?? '');
      }
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Greška', 'Naslov je obavezan');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'memories', id), {
        title,
        description,
      });
      Alert.alert('Uspjeh!', 'Uspomena je ažurirana!');
      router.back();
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setSaving(false);
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={[styles.backButtonText, { color: colors.primary }]}>← Nazad</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>Uredi uspomenu</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Naslov uspomene"
        placeholderTextColor={colors.subtext}
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Opis (opcionalno)"
        placeholderTextColor={colors.subtext}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>💾 Spremi izmjene</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: {
    marginTop: 48,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backButtonText: { fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  input: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});