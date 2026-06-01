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
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firestore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { hapticSuccess, hapticError } from '../../lib/haptics';

export default function AddMemoryScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Maksimum', 'Možeš dodati maksimalno 5 slika');
      return;
    }
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
      setImages([...images, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    if (images.length >= 5) {
      Alert.alert('Maksimum', 'Možeš dodati maksimalno 5 slika');
      return;
    }
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
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string, userId: string, index: number): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const fileName = `${userId}/${Date.now()}_${index}.jpg`;

    const { error } = await supabase.storage
      .from('memories')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    const { data } = supabase.storage.from('memories').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title || images.length === 0) {
      Alert.alert('Greška', 'Naslov i barem jedna slika su obavezni');
      await hapticError();
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

      // Upload svih slika
      const imageUrls = await Promise.all(
        images.map((uri, index) => uploadImage(uri, session.user.id, index))
      );

      await addDoc(collection(db, 'memories'), {
        title,
        description,
        latitude,
        longitude,
        imageUrls,
        imageUrl: imageUrls[0], // za kompatibilnost sa starim kodom
        userId: session.user.id,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Uspjeh!', 'Uspomena je spremljena!');
      await hapticSuccess();
      setTitle('');
      setDescription('');
      setImages([]);
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

      {/* Prikaz odabranih slika */}
      {images.length > 0 && (
        <FlatList
          horizontal
          data={images}
          keyExtractor={(_, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          style={styles.imageList}
          renderItem={({ item, index }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>Glavna</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Gumbi za dodavanje slika */}
      <View style={styles.imageButtons}>
        <TouchableOpacity
          style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pickImage}
        >
          <Text style={[styles.imageButtonText, { color: colors.subtext }]}>📷 Fotografiraj</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.imageButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={pickFromGallery}
        >
          <Text style={[styles.imageButtonText, { color: colors.subtext }]}>🖼️ Galerija</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.imageCount, { color: colors.subtext }]}>
        {images.length}/5 slika
      </Text>

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
  imageList: { marginBottom: 12 },
  imageContainer: { position: 'relative', marginRight: 8 },
  image: { width: 120, height: 120, borderRadius: 12 },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: { color: '#fff', fontSize: 12 },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  imageButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  imageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  imageButtonText: { fontSize: 14 },
  imageCount: { fontSize: 12, marginBottom: 16, textAlign: 'center' },
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