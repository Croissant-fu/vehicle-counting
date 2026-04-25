import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionSetupScreen from './SessionSetupScreen';

const mockCreateSession = jest.fn().mockResolvedValue({
  id: 'sess_test', location_name: 'Test', intersection_type: '4way',
  time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
  started_at: '2026-04-15T08:00:00Z', ended_at: null, total_count: 0,
});

jest.mock('../modules/session/SessionManager', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...(args as Parameters<typeof mockCreateSession>)),
}));
jest.mock('../modules/location/LocationService', () => ({
  requestAndGetLocation: jest.fn().mockResolvedValue({ lat: -6.2088, lng: 106.8456 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockNavigate }),
}));

test('shows GPS coordinates after mount', async () => {
  const { findByText } = render(<SessionSetupScreen />);
  expect(await findByText(/-6.2088/)).toBeTruthy();
});

test('disables Start Counting when location name is empty', async () => {
  const { getByTestId } = render(<SessionSetupScreen />);
  const btn = getByTestId('start-counting-btn');
  expect(btn.props.accessibilityState?.disabled).toBe(true);
});

test('navigates to Counting after valid form submitted', async () => {
  const { getByTestId, getByPlaceholderText } = render(<SessionSetupScreen />);
  fireEvent.changeText(getByPlaceholderText('e.g. Jl. Sudirman / Jl. Thamrin'), 'Test Location');
  await waitFor(() => expect(getByTestId('start-counting-btn').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('start-counting-btn'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Counting', expect.objectContaining({ session: expect.any(Object) })));
});
