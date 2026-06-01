import * as Location from 'expo-location';

export async function getLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'Nepoznata država';
    
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (result.length > 0) {
      const place = result[0];
      return place.country ?? 'Nepoznata država';
    }
    return 'Nepoznata država';
  } catch {
    return 'Nepoznata država';
  }
}