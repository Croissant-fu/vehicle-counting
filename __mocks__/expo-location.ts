export const requestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getCurrentPositionAsync = jest.fn().mockResolvedValue({
  coords: { latitude: -6.2088, longitude: 106.8456 },
});
export const Accuracy = { High: 4 };
