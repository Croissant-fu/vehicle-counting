import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionReviewScreen from './SessionReviewScreen';

jest.mock('../modules/session/SessionManager', () => ({
  getSession: jest.fn().mockResolvedValue({
    id: 'sess_test', location_name: 'Test St', intersection_type: '4way',
    time_period: 'am_peak', lat: null, lng: null, custom_legs: null,
    started_at: '2026-04-15T08:00:00Z', ended_at: '2026-04-15T09:00:00Z', total_count: 2,
  }),
}));
jest.mock('../modules/export/ExportEngine', () => ({
  getSessionCounts: jest.fn().mockResolvedValue([
    { id: 1, session_id: 'sess_test', from_direction: 'N', movement: 'straight', to_direction: 'S', vehicle_type: 'moto', timestamp: '...' },
    { id: 2, session_id: 'sess_test', from_direction: 'S', movement: 'left', to_direction: 'E', vehicle_type: 'car', timestamp: '...' },
  ]),
  exportSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { sessionId: 'sess_test' } }),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

test('displays location name and total count', async () => {
  const { findByText } = render(<SessionReviewScreen />);
  expect(await findByText('Test St')).toBeTruthy();
  expect(await findByText('2 vehicles')).toBeTruthy();
});

test('shows movement breakdown rows', async () => {
  const { findByText } = render(<SessionReviewScreen />);
  expect(await findByText('N → S')).toBeTruthy();
});

test('export button triggers exportSession for csv', async () => {
  const { findByTestId } = render(<SessionReviewScreen />);
  const { exportSession } = require('../modules/export/ExportEngine');
  fireEvent.press(await findByTestId('export-csv-btn'));
  await waitFor(() => expect(exportSession).toHaveBeenCalledWith(expect.any(Object), expect.any(Array), 'csv'));
});
