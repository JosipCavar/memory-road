import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

export default function AddMemoryScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Greška', 'Potrebna je dozvola za kameru');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Greška', 'Potrebna je dozvola za galeriju');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string, userId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const fileName = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('memories')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    const { data } = supabase.storage.from('memories').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title || !image) {
      Alert.alert('Greška', 'Naslov i slika su obavezni');
      return;
    }

    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Greška', 'Potrebna je dozvola za lokaciju');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Nisi prijavljen');

      const imageUrl = await uploadImage(image, session.user.id);

      await addDoc(collection(db, 'memories'), {
        title,
        description,
        latitude,
        longitude,
        imageUrl,
        userId: session.user.id,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Uspjeh!', 'Uspomena je spremljena!');
      setTitle('');
      setDescription('');
      setImage(null);
      router.push('/(tabs)/map');
    } catch (error: any) {
      Alert.alert('Greška', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Nova uspomena</Text>

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.imagePlaceholderText, { color: colors.subtext }]}>📷 Fotografiraj</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.galleryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={pickFromGallery}
      >
        <Text style={[styles.galleryButtonText, { color: colors.subtext }]}>🖼️ Odaberi iz galerije</Text>
      </TouchableOpacity>

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
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>📍 Spremi uspomenu</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, marginTop: 48 },
  imageButton: { marginBottom: 12 },
  image: { width: '100%', height: 250, borderRadius: 12 },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: { fontSize: 18 },
  galleryButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  galleryButtonText: { fontSize: 14 },
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