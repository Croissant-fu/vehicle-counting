import * as Location from 'expo-location';

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function requestAndGetLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
