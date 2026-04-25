import { renderHook } from '@testing-library/react-native';
import { useResponsiveLayout } from './useResponsiveLayout';

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.useWindowDimensions = jest.fn().mockReturnValue({ width: 390, height: 844 });
  return rn;
});

test('isTablet is false for phone-width (390px)', () => {
  const { result } = renderHook(() => useResponsiveLayout());
  expect(result.current.isTablet).toBe(false);
});
