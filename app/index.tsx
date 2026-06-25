import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const check = async () => {
      const onboarding = await AsyncStorage.getItem('onboarding_completed');
      setOnboardingCompleted(!!onboarding);

      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);

      setLoading(false);
    };
    check();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  if (!hasSession) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/map" />;
}