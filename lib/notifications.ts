import * as Notifications from 'expo-notifications';
import { Platform, LogBox } from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firestore';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return 'granted';
}

export async function scheduleMemoryOfTheDayNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🗺️ Memory Road',
      body: 'Pogledaj svoju uspomenu dana! 📅',
      data: { screen: 'memoryoftheday' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}

export async function checkNewLikes(userId: string) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false),
      where('type', '==', 'like')
    );
    const snapshot = await getDocs(q);

    if (snapshot.docs.length > 0) {
      await sendLocalNotification(
        '❤️ Novi lajkovi!',
        `Imaš ${snapshot.docs.length} novih lajkova na tvojim uspomenama!`
      );

      // Označi kao pročitano
      await Promise.all(
        snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }))
      );
    }
  } catch (error) {
    console.error(error);
  }
}