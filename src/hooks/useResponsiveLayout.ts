import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  return { isTablet: width >= TABLET_BREAKPOINT };
}
