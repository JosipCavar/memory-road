import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '../lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  useEffect(() => {
    const init = async () => {
      const onboarding = await AsyncStorage.getItem('onboarding_completed');
      setOnboardingCompleted(!!onboarding);

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f0f' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <Stack.Screen name="onboarding" />
        ) : session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
        <Stack.Screen name="memory/[id]" />
        <Stack.Screen name="memory/edit/[id]" />
        <Stack.Screen name="share/[userId]" />
        <Stack.Screen name="memories-list" />
        <Stack.Screen name="memoryoftheday" />
        <Stack.Screen name="timeline" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="stats-chart" />
        <Stack.Screen name="challenges" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </ThemeProvider>
  );
}