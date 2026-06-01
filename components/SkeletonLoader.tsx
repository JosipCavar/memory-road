import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#333' : '#ddd',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MemoryCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={100} height={100} borderRadius={0} />
      <View style={styles.content}>
        <Skeleton width="80%" height={16} borderRadius={8} style={styles.mb8} />
        <Skeleton width="50%" height={12} borderRadius={6} style={styles.mb8} />
        <Skeleton width="60%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  content: { flex: 1, padding: 12 },
  mb8: { marginBottom: 8 },
});