jest.mock('expo-location');
import * as Location from 'expo-location';
import { requestAndGetLocation } from './LocationService';

describe('requestAndGetLocation', () => {
  test('returns coordinates when permission granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: -6.2088, longitude: 106.8456 },
    });
    const result = await requestAndGetLocation();
    expect(result).toEqual({ lat: -6.2088, lng: 106.8456 });
  });

  test('returns null when permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const result = await requestAndGetLocation();
    expect(result).toBeNull();
  });

  test('returns null when location fetch throws', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('timeout'));
    const result = await requestAndGetLocation();
    expect(result).toBeNull();
  });
});
