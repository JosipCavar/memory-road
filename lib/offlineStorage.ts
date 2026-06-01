import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMORIES_KEY = 'cached_memories';
const LAST_SYNC_KEY = 'last_sync';

export async function cacheMemories(userId: string, memories: any[]) {
  try {
    await AsyncStorage.setItem(`${MEMORIES_KEY}_${userId}`, JSON.stringify(memories));
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Cache error:', error);
  }
}

export async function getCachedMemories(userId: string): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(`${MEMORIES_KEY}_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Get cache error:', error);
    return [];
  }
}

export async function getLastSync(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export async function clearCache(userId: string) {
  try {
    await AsyncStorage.removeItem(`${MEMORIES_KEY}_${userId}`);
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error('Clear cache error:', error);
  }
}