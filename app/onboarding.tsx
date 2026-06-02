import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../lib/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🗺️',
    title: 'Dobrodošao u Memory Road',
    description: 'Spremi svoje uspomene na interaktivnoj karti i nikad ne zaboravi gdje si bio.',
  },
  {
    id: '2',
    emoji: '📍',
    title: 'Dodaj uspomene',
    description: 'Fotografiraj trenutak, dodaj opis i automatski spremi lokaciju na karti.',
  },
  {
    id: '3',
    emoji: '❤️',
    title: 'Favoriti i Timeline',
    description: 'Označi omiljene uspomene i pregledaj svoju životnu priču na vremenskoj liniji.',
  },
  {
    id: '4',
    emoji: '🔗',
    title: 'Dijeli s prijateljima',
    description: 'Generiraj QR kod i podijeli svoju kartu s prijateljima i obitelji.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { colors, fonts } = useTheme();

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
        <Text style={[styles.skipText, { color: colors.subtext, fontFamily: fonts.regular }]}>Preskoči</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
            <Text style={[styles.slideTitle, { color: colors.text, fontFamily: fonts.bold }]}>{item.title}</Text>
            <Text style={[styles.slideDescription, { color: colors.subtext, fontFamily: fonts.regular }]}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.indicators}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              {
                backgroundColor: i === currentIndex ? colors.primary : colors.border,
                width: i === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleNext}
      >
        <Text style={[styles.nextButtonText, { fontFamily: fonts.bold }]}>
          {currentIndex === SLIDES.length - 1 ? 'Počni! 🚀' : 'Dalje →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
  },
  skipText: { fontSize: 16 },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  slideEmoji: { fontSize: 80, marginBottom: 32 },
  slideTitle: { fontSize: 28, textAlign: 'center', marginBottom: 16 },
  slideDescription: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 48,
  },
  nextButtonText: { color: '#fff', fontSize: 18 },
});