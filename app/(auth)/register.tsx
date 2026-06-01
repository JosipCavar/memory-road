import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { db } from '../../lib/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../lib/ThemeContext';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Greška', 'Popuni sva polja');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      Alert.alert('Greška', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await setDoc(doc(db, 'users', data.user.id), {
        username,
        email,
        shareToken: data.user.id,
        createdAt: new Date().toISOString(),
      });
    }

    Alert.alert('Uspjeh!', 'Račun je kreiran. Prijavi se.');
    router.push('/(auth)/login');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.text }]}>🗺️ Memory Road</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Kreiraj račun</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Korisničko ime"
          placeholderTextColor={colors.subtext}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Email"
          placeholderTextColor={colors.subtext}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Lozinka"
          placeholderTextColor={colors.subtext}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Kreiranje...' : 'Registriraj se'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={[styles.link, { color: colors.primary }]}>
            Već imaš račun? Prijavi se
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 32 },
  input: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { textAlign: 'center', fontSize: 14 },
});