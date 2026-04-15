import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CountingScreen from './CountingScreen';

const mockRecord = jest.fn().mockResolvedValue({ id: 1, to_direction: 'S' });
const mockUndo   = jest.fn().mockResolvedValue(true);

jest.mock('../modules/counter/CounterEngine', () => ({
  CounterEngine: jest.fn().mockImplementation(() => ({
    record: mockRecord,
    undo: mockUndo,
  })),
}));
jest.mock('../modules/session/SessionManager', () => ({
  endSession: jest.fn().mockResolvedValue({}),
  getSession: jest.fn().mockResolvedValue({ total_count: 1 }),
}));

const mockSession = {
  id: 'sess_test', location_name: 'Test', intersection_type: '4way',
  time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
  started_at: new Date().toISOString(), ended_at: null, total_count: 0,
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockNavigate }),
  useRoute: () => ({ params: { session: mockSession } }),
}));

beforeEach(() => { jest.clearAllMocks(); });

test('records a count when Straight is pressed', async () => {
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('dir-straight'));
  await waitFor(() => expect(mockRecord).toHaveBeenCalledWith({
    from_direction: 'N',
    movement: 'straight',
    vehicle_type: 'moto',
  }));
});

test('calls undo when undo button pressed', async () => {
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('undo-btn'));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledTimes(1));
});

test('shows End Session confirmation and navigates on confirm', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
    const destructiveBtn = buttons?.find((b) => b.style === 'destructive');
    destructiveBtn?.onPress?.();
  });
  const { getByTestId } = render(<CountingScreen />);
  fireEvent.press(getByTestId('end-session-btn'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('SessionReview', { sessionId: 'sess_test' }));
});
