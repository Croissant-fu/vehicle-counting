import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionsListScreen from './SessionsListScreen';

jest.mock('../modules/session/SessionManager', () => ({
  listSessions: jest.fn().mockResolvedValue([
    {
      id: 'sess_1', location_name: 'Jl. Sudirman', intersection_type: '4way',
      time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
      started_at: '2026-04-15T08:30:00Z', ended_at: '2026-04-15T09:00:00Z', total_count: 42,
    },
  ]),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => (() => void) | void) => { cb(); },
}));

test('displays session location name', async () => {
  const { findByText } = render(<SessionsListScreen />);
  expect(await findByText('Jl. Sudirman')).toBeTruthy();
});

test('navigates to SessionSetup when New Session pressed', async () => {
  const { findByTestId } = render(<SessionsListScreen />);
  fireEvent.press(await findByTestId('new-session-btn'));
  expect(mockNavigate).toHaveBeenCalledWith('SessionSetup');
});

test('navigates to SessionReview when a session is tapped', async () => {
  const { findByText } = render(<SessionsListScreen />);
  fireEvent.press(await findByText('Jl. Sudirman'));
  expect(mockNavigate).toHaveBeenCalledWith('SessionReview', { sessionId: 'sess_1' });
});
